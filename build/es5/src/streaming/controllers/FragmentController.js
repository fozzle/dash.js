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

var _voMetricsHTTPRequest = require('../vo/metrics/HTTPRequest');

var _voDataChunk = require('../vo/DataChunk');

var _voDataChunk2 = _interopRequireDefault(_voDataChunk);

var _modelsFragmentModel = require('../models/FragmentModel');

var _modelsFragmentModel2 = _interopRequireDefault(_modelsFragmentModel);

var _modelsMetricsModel = require('../models/MetricsModel');

var _modelsMetricsModel2 = _interopRequireDefault(_modelsMetricsModel);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _coreDebug = require('../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

function FragmentController() /*config*/{

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        fragmentModels = undefined;

    function setup() {
        fragmentModels = {};
        eventBus.on(_coreEventsEvents2['default'].FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
    }

    function process(bytes) {
        var result = null;
        if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
            result = new Uint8Array(bytes);
        }
        return result;
    }

    function getModel(type) {
        var model = fragmentModels[type];
        if (!model) {
            model = (0, _modelsFragmentModel2['default'])(context).create({ metricsModel: (0, _modelsMetricsModel2['default'])(context).getInstance() });
            fragmentModels[type] = model;
        }

        return model;
    }

    function isInitializationRequest(request) {
        return request && request.type && request.type === _voMetricsHTTPRequest.HTTPRequest.INIT_SEGMENT_TYPE;
    }

    function reset() {
        eventBus.off(_coreEventsEvents2['default'].FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        for (var model in fragmentModels) {
            fragmentModels[model].reset();
        }
        fragmentModels = {};
    }

    function createDataChunk(bytes, request, streamId) {
        var chunk = new _voDataChunk2['default']();

        chunk.streamId = streamId;
        chunk.mediaInfo = request.mediaInfo;
        chunk.segmentType = request.type;
        chunk.start = request.startTime;
        chunk.duration = request.duration;
        chunk.end = chunk.start + chunk.duration;
        chunk.bytes = bytes;
        chunk.index = request.index;
        chunk.quality = request.quality;

        return chunk;
    }

    function onFragmentLoadingCompleted(e) {
        if (fragmentModels[e.request.mediaType] !== e.sender) return;

        var scheduleController = e.sender.getScheduleController();
        var request = e.request;
        var bytes = e.response;
        var isInit = isInitializationRequest(request);
        var streamId = scheduleController.getStreamProcessor().getStreamInfo().id;

        if (!bytes) {
            log('No ' + request.mediaType + ' bytes to push.');
            return;
        }

        var chunk = createDataChunk(bytes, request, streamId);
        eventBus.trigger(isInit ? _coreEventsEvents2['default'].INIT_FRAGMENT_LOADED : _coreEventsEvents2['default'].MEDIA_FRAGMENT_LOADED, { chunk: chunk, fragmentModel: e.sender });
    }

    instance = {
        process: process,
        getModel: getModel,
        isInitializationRequest: isInitializationRequest,
        reset: reset
    };

    setup();

    return instance;
}

FragmentController.__dashjs_factory_name = 'FragmentController';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(FragmentController);
module.exports = exports['default'];
//# sourceMappingURL=FragmentController.js.map
