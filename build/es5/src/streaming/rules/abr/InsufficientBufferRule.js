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

var _coreEventBus = require('../../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _coreDebug = require('../../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

function InsufficientBufferRule(config) {

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var metricsModel = config.metricsModel;

    var instance = undefined,
        bufferStateDict = undefined,
        lastSwitchTime = undefined,
        waitToSwitchTime = undefined;

    function setup() {
        bufferStateDict = {};
        lastSwitchTime = 0;
        waitToSwitchTime = 1000;
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, instance);
    }

    function execute(rulesContext, callback) {
        var now = new Date().getTime();
        var mediaType = rulesContext.getMediaInfo().type;
        var current = rulesContext.getCurrentValue();
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        var lastBufferStateVO = metrics.BufferState.length > 0 ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        var switchRequest = (0, _SwitchRequest2['default'])(context).create(_SwitchRequest2['default'].NO_CHANGE, _SwitchRequest2['default'].WEAK, { name: InsufficientBufferRule.__dashjs_factory_name });

        if (now - lastSwitchTime < waitToSwitchTime || lastBufferStateVO === null) {
            callback(switchRequest);
            return;
        }

        setBufferInfo(mediaType, lastBufferStateVO.state);
        // After the sessions first buffer loaded event , if we ever have a buffer empty event we want to switch all the way down.
        if (lastBufferStateVO.state === _controllersBufferController2['default'].BUFFER_EMPTY && bufferStateDict[mediaType].firstBufferLoadedEvent !== undefined) {
            switchRequest.value = 0;
            switchRequest.priority = _SwitchRequest2['default'].STRONG;
            switchRequest.reason.bufferState = lastBufferStateVO.state;

            switchRequest = (0, _SwitchRequest2['default'])(context).create(0, _SwitchRequest2['default'].STRONG);
        }

        if (switchRequest.value !== _SwitchRequest2['default'].NO_CHANGE && switchRequest.value !== current) {
            log('InsufficientBufferRule requesting switch to index: ', switchRequest.value, 'type: ', mediaType, ' Priority: ', switchRequest.priority === _SwitchRequest2['default'].DEFAULT ? 'Default' : switchRequest.priority === _SwitchRequest2['default'].STRONG ? 'Strong' : 'Weak');
        }

        lastSwitchTime = now;
        callback(switchRequest);
    }

    function setBufferInfo(type, state) {
        bufferStateDict[type] = bufferStateDict[type] || {};
        bufferStateDict[type].state = state;
        if (state === _controllersBufferController2['default'].BUFFER_LOADED && !bufferStateDict[type].firstBufferLoadedEvent) {
            bufferStateDict[type].firstBufferLoadedEvent = true;
        }
    }

    function onPlaybackSeeking() {
        bufferStateDict = {};
    }

    function reset() {
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        bufferStateDict = {};
        lastSwitchTime = 0;
    }

    instance = {
        execute: execute,
        reset: reset
    };

    setup();

    return instance;
}

InsufficientBufferRule.__dashjs_factory_name = 'InsufficientBufferRule';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(InsufficientBufferRule);
module.exports = exports['default'];
//# sourceMappingURL=InsufficientBufferRule.js.map
