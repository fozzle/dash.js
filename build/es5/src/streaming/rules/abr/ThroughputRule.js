/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _SwitchRequest = require('../SwitchRequest');

var _SwitchRequest2 = _interopRequireDefault(_SwitchRequest);

var _controllersBufferController = require('../../controllers/BufferController');

var _controllersBufferController2 = _interopRequireDefault(_controllersBufferController);

var _controllersAbrController = require('../../controllers/AbrController');

var _controllersAbrController2 = _interopRequireDefault(_controllersAbrController);

var _modelsMediaPlayerModel = require('../../models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _voMetricsHTTPRequest = require('../../vo/metrics/HTTPRequest');

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _coreDebug = require('../../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

function ThroughputRule(config) {

    var MAX_MEASUREMENTS_TO_KEEP = 20;
    var AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 3;
    var AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 4;
    var CACHE_LOAD_THRESHOLD_VIDEO = 50;
    var CACHE_LOAD_THRESHOLD_AUDIO = 5;
    var THROUGHPUT_DECREASE_SCALE = 1.3;
    var THROUGHPUT_INCREASE_SCALE = 1.3;

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var dashMetrics = config.dashMetrics;
    var metricsModel = config.metricsModel;

    var throughputArray = undefined,
        cacheLoadDict = undefined,
        mediaPlayerModel = undefined;

    function setup() {
        throughputArray = [];
        cacheLoadDict = { audio: { threshold: CACHE_LOAD_THRESHOLD_AUDIO, value: NaN }, video: { threshold: CACHE_LOAD_THRESHOLD_VIDEO, value: NaN } }; //threshold is in milliseconds
        mediaPlayerModel = (0, _modelsMediaPlayerModel2['default'])(context).getInstance();
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
    }

    function getSample(type, isDynamic) {
        var size = Math.min(throughputArray[type].length, isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD);
        var sampleArray = throughputArray[type].slice(size * -1, throughputArray[type].length);
        if (sampleArray.length > 1) {
            sampleArray.reduce(function (a, b) {
                if (a * THROUGHPUT_INCREASE_SCALE <= b || a >= b * THROUGHPUT_DECREASE_SCALE) {
                    size++;
                }
                return b;
            });
        }
        size = Math.min(throughputArray[type].length, size);
        return throughputArray[type].slice(size * -1, throughputArray[type].length);
    }

    function getAverageThroughput(type, isDynamic) {
        var sample = getSample(type, isDynamic);
        var averageThroughput = 0;
        if (sample.length > 0) {
            var totalSampledValue = sample.reduce(function (a, b) {
                return a + b;
            }, 0);
            averageThroughput = totalSampledValue / sample.length;
        }
        if (throughputArray[type].length >= MAX_MEASUREMENTS_TO_KEEP) {
            throughputArray[type].shift();
        }
        return averageThroughput / 1000 * mediaPlayerModel.getBandwidthSafetyFactor();
    }

    function execute(rulesContext, callback) {

        var mediaInfo = rulesContext.getMediaInfo();
        var mediaType = mediaInfo.type;
        var currentQuality = rulesContext.getCurrentValue();
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        var streamProcessor = rulesContext.getStreamProcessor();
        var abrController = streamProcessor.getABRController();
        var isDynamic = streamProcessor.isDynamic();
        var lastRequest = dashMetrics.getCurrentHttpRequest(metrics);
        var bufferStateVO = metrics.BufferState.length > 0 ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        var switchRequest = (0, _SwitchRequest2['default'])(context).create(_SwitchRequest2['default'].NO_CHANGE, _SwitchRequest2['default'].WEAK, { name: ThroughputRule.__dashjs_factory_name });

        if (!metrics || !lastRequest || lastRequest.type !== _voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE || !bufferStateVO) {
            callback(switchRequest);
            return;
        }

        var downloadTimeInMilliseconds = undefined;

        if (lastRequest.trace && lastRequest.trace.length) {

            downloadTimeInMilliseconds = lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime() + 1; //Make sure never 0 we divide by this value. Avoid infinity!

            var bytes = lastRequest.trace.reduce(function (a, b) {
                return a + b.b[0];
            }, 0);
            var lastRequestThroughput = Math.round(bytes * 8 / (downloadTimeInMilliseconds / 1000));

            //Prevent cached fragment loads from skewing the average throughput value - allow first even if cached to set allowance for ABR rules..
            if (downloadTimeInMilliseconds <= cacheLoadDict[mediaType].threshold) {
                cacheLoadDict[mediaType].value = lastRequestThroughput / 1000;
            } else {
                cacheLoadDict[mediaType].value = NaN;
                storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
            }
        }

        var throughput = Math.round(!isNaN(cacheLoadDict[mediaType].value) ? cacheLoadDict[mediaType].value : getAverageThroughput(mediaType, isDynamic));
        abrController.setAverageThroughput(mediaType, throughput);

        if (abrController.getAbandonmentStateFor(mediaType) !== _controllersAbrController2['default'].ABANDON_LOAD) {

            if (bufferStateVO.state === _controllersBufferController2['default'].BUFFER_LOADED || isDynamic) {
                var newQuality = abrController.getQualityForBitrate(mediaInfo, throughput);
                streamProcessor.getScheduleController().setTimeToLoadDelay(0);
                switchRequest.value = newQuality;
                switchRequest.priority = _SwitchRequest2['default'].DEFAULT;
                switchRequest.reason.throughput = throughput;
            }

            if (switchRequest.value !== _SwitchRequest2['default'].NO_CHANGE && switchRequest.value !== currentQuality) {
                log('ThroughputRule requesting switch to index: ', switchRequest.value, 'type: ', mediaType, ' Priority: ', switchRequest.priority === _SwitchRequest2['default'].DEFAULT ? 'Default' : switchRequest.priority === _SwitchRequest2['default'].STRONG ? 'Strong' : 'Weak', 'Average throughput', Math.round(throughput), 'kbps');
            }
        }

        callback(switchRequest);
    }

    function reset() {
        setup();
    }

    var instance = {
        execute: execute,
        reset: reset
    };

    setup();
    return instance;
}

ThroughputRule.__dashjs_factory_name = 'ThroughputRule';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(ThroughputRule);
module.exports = exports['default'];
//# sourceMappingURL=ThroughputRule.js.map
