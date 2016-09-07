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

var _modelsMediaPlayerModel = require('../../models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _coreDebug = require('../../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

function AbandonRequestsRule() {

    var ABANDON_MULTIPLIER = 1.8;
    var GRACE_TIME_THRESHOLD = 500;
    var MIN_LENGTH_TO_AVERAGE = 5;

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;

    var fragmentDict = undefined,
        abandonDict = undefined,
        throughputArray = undefined,
        mediaPlayerModel = undefined;

    function setup() {
        fragmentDict = {};
        abandonDict = {};
        throughputArray = [];
        mediaPlayerModel = (0, _modelsMediaPlayerModel2['default'])(context).getInstance();
    }

    function setFragmentRequestDict(type, id) {
        fragmentDict[type] = fragmentDict[type] || {};
        fragmentDict[type][id] = fragmentDict[type][id] || {};
    }

    function storeLastRequestThroughputByType(type, throughput) {
        throughputArray[type] = throughputArray[type] || [];
        throughputArray[type].push(throughput);
    }

    function execute(rulesContext, callback) {

        var mediaInfo = rulesContext.getMediaInfo();
        var mediaType = mediaInfo.type;
        var req = rulesContext.getCurrentValue().request;
        var switchRequest = (0, _SwitchRequest2['default'])(context).create(_SwitchRequest2['default'].NO_CHANGE, _SwitchRequest2['default'].WEAK, { name: AbandonRequestsRule.__dashjs_factory_name });

        if (!isNaN(req.index)) {

            setFragmentRequestDict(mediaType, req.index);

            var fragmentInfo = fragmentDict[mediaType][req.index];
            if (fragmentInfo === null || req.firstByteDate === null || abandonDict.hasOwnProperty(fragmentInfo.id)) {
                callback(switchRequest);
                return;
            }

            //setup some init info based on first progress event
            if (fragmentInfo.firstByteTime === undefined) {
                throughputArray[mediaType] = [];
                fragmentInfo.firstByteTime = req.firstByteDate.getTime();
                fragmentInfo.segmentDuration = req.duration;
                fragmentInfo.bytesTotal = req.bytesTotal;
                fragmentInfo.id = req.index;
            }
            fragmentInfo.bytesLoaded = req.bytesLoaded;
            fragmentInfo.elapsedTime = new Date().getTime() - fragmentInfo.firstByteTime;

            if (fragmentInfo.bytesLoaded > 0 && fragmentInfo.elapsedTime > 0) {
                storeLastRequestThroughputByType(mediaType, Math.round(fragmentInfo.bytesLoaded * 8 / fragmentInfo.elapsedTime));
            }

            if (throughputArray[mediaType].length >= MIN_LENGTH_TO_AVERAGE && fragmentInfo.elapsedTime > GRACE_TIME_THRESHOLD && fragmentInfo.bytesLoaded < fragmentInfo.bytesTotal) {

                var totalSampledValue = throughputArray[mediaType].reduce(function (a, b) {
                    return a + b;
                }, 0);
                fragmentInfo.measuredBandwidthInKbps = Math.round(totalSampledValue / throughputArray[mediaType].length);
                fragmentInfo.estimatedTimeOfDownload = (fragmentInfo.bytesTotal * 8 / fragmentInfo.measuredBandwidthInKbps / 1000).toFixed(2);
                //log("id:",fragmentInfo.id, "kbps:", fragmentInfo.measuredBandwidthInKbps, "etd:",fragmentInfo.estimatedTimeOfDownload, fragmentInfo.bytesLoaded);

                if (fragmentInfo.estimatedTimeOfDownload < fragmentInfo.segmentDuration * ABANDON_MULTIPLIER || rulesContext.getTrackInfo().quality === 0) {

                    callback(switchRequest);
                    return;
                } else if (!abandonDict.hasOwnProperty(fragmentInfo.id)) {

                    var abrController = rulesContext.getStreamProcessor().getABRController();
                    var bytesRemaining = fragmentInfo.bytesTotal - fragmentInfo.bytesLoaded;
                    var bitrateList = abrController.getBitrateList(mediaInfo);
                    var newQuality = abrController.getQualityForBitrate(mediaInfo, fragmentInfo.measuredBandwidthInKbps * mediaPlayerModel.getBandwidthSafetyFactor());
                    var estimateOtherBytesTotal = fragmentInfo.bytesTotal * bitrateList[newQuality].bitrate / bitrateList[abrController.getQualityFor(mediaType, mediaInfo.streamInfo)].bitrate;

                    if (bytesRemaining > estimateOtherBytesTotal) {

                        switchRequest.value = newQuality;
                        switchRequest.priority = _SwitchRequest2['default'].STRONG;
                        switchRequest.reason.throughput = fragmentInfo.measuredBandwidthInKbps;
                        abandonDict[fragmentInfo.id] = fragmentInfo;
                        log('AbandonRequestsRule ( ', mediaType, 'frag id', fragmentInfo.id, ') is asking to abandon and switch to quality to ', newQuality, ' measured bandwidth was', fragmentInfo.measuredBandwidthInKbps);
                        delete fragmentDict[mediaType][fragmentInfo.id];
                    }
                }
            } else if (fragmentInfo.bytesLoaded === fragmentInfo.bytesTotal) {
                delete fragmentDict[mediaType][fragmentInfo.id];
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

AbandonRequestsRule.__dashjs_factory_name = 'AbandonRequestsRule';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(AbandonRequestsRule);
module.exports = exports['default'];
//# sourceMappingURL=AbandonRequestsRule.js.map
