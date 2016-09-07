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

var _controllersAbrController = require('../../controllers/AbrController');

var _controllersAbrController2 = _interopRequireDefault(_controllersAbrController);

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _coreDebug = require('../../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

function BufferOccupancyRule(config) {

    var instance = undefined;
    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;

    var metricsModel = config.metricsModel;
    var dashMetrics = config.dashMetrics;

    var lastSwitchTime = undefined,
        mediaPlayerModel = undefined;

    function setup() {
        lastSwitchTime = 0;
        mediaPlayerModel = (0, _modelsMediaPlayerModel2['default'])(context).getInstance();
    }

    function execute(rulesContext, callback) {
        var now = new Date().getTime() / 1000;
        var mediaInfo = rulesContext.getMediaInfo();
        var representationInfo = rulesContext.getTrackInfo();
        var mediaType = mediaInfo.type;
        var waitToSwitchTime = !isNaN(representationInfo.fragmentDuration) ? representationInfo.fragmentDuration / 2 : 2;
        var current = rulesContext.getCurrentValue();
        var streamProcessor = rulesContext.getStreamProcessor();
        var abrController = streamProcessor.getABRController();
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        var lastBufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
        var lastBufferStateVO = metrics.BufferState.length > 0 ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        var isBufferRich = false;
        var maxIndex = mediaInfo.representationCount - 1;
        var switchRequest = (0, _SwitchRequest2['default'])(context).create(_SwitchRequest2['default'].NO_CHANGE, _SwitchRequest2['default'].WEAK, { name: BufferOccupancyRule.__dashjs_factory_name });

        if (now - lastSwitchTime < waitToSwitchTime || abrController.getAbandonmentStateFor(mediaType) === _controllersAbrController2['default'].ABANDON_LOAD) {
            callback(switchRequest);
            return;
        }

        if (lastBufferStateVO !== null) {
            // This will happen when another rule tries to switch from top to any other.
            // If there is enough buffer why not try to stay at high level.
            if (lastBufferLevel > lastBufferStateVO.target) {
                isBufferRich = lastBufferLevel - lastBufferStateVO.target > mediaPlayerModel.getRichBufferThreshold();

                if (isBufferRich && mediaInfo.representationCount > 1) {
                    switchRequest.value = maxIndex;
                    switchRequest.priority = _SwitchRequest2['default'].STRONG;
                    switchRequest.reason.bufferLevel = lastBufferLevel;
                    switchRequest.reason.bufferTarget = lastBufferStateVO.target;
                }
            }
        }

        if (switchRequest.value !== _SwitchRequest2['default'].NO_CHANGE && switchRequest.value !== current) {
            log('BufferOccupancyRule requesting switch to index: ', switchRequest.value, 'type: ', mediaType, ' Priority: ', switchRequest.priority === _SwitchRequest2['default'].DEFAULT ? 'Default' : switchRequest.priority === _SwitchRequest2['default'].STRONG ? 'Strong' : 'Weak');
        }

        callback(switchRequest);
    }

    function reset() {
        lastSwitchTime = 0;
    }

    instance = {
        execute: execute,
        reset: reset
    };

    setup();

    return instance;
}

BufferOccupancyRule.__dashjs_factory_name = 'BufferOccupancyRule';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(BufferOccupancyRule);
module.exports = exports['default'];
//# sourceMappingURL=BufferOccupancyRule.js.map
