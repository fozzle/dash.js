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

var _controllersAbrController = require('./controllers/AbrController');

var _controllersAbrController2 = _interopRequireDefault(_controllersAbrController);

var _controllersBufferController = require('./controllers/BufferController');

var _controllersBufferController2 = _interopRequireDefault(_controllersBufferController);

var _controllersStreamController = require('./controllers/StreamController');

var _controllersStreamController2 = _interopRequireDefault(_controllersStreamController);

var _controllersMediaController = require('./controllers/MediaController');

var _controllersMediaController2 = _interopRequireDefault(_controllersMediaController);

var _controllersTextController = require('./controllers/TextController');

var _controllersTextController2 = _interopRequireDefault(_controllersTextController);

var _controllersScheduleController = require('./controllers/ScheduleController');

var _controllersScheduleController2 = _interopRequireDefault(_controllersScheduleController);

var _rulesRulesController = require('./rules/RulesController');

var _rulesRulesController2 = _interopRequireDefault(_rulesRulesController);

var _modelsMediaPlayerModel = require('./models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _modelsMetricsModel = require('./models/MetricsModel');

var _modelsMetricsModel2 = _interopRequireDefault(_modelsMetricsModel);

var _FragmentLoader = require('./FragmentLoader');

var _FragmentLoader2 = _interopRequireDefault(_FragmentLoader);

var _utilsRequestModifier = require('./utils/RequestModifier');

var _utilsRequestModifier2 = _interopRequireDefault(_utilsRequestModifier);

var _controllersSourceBufferController = require('./controllers/SourceBufferController');

var _controllersSourceBufferController2 = _interopRequireDefault(_controllersSourceBufferController);

var _TextSourceBuffer = require('./TextSourceBuffer');

var _TextSourceBuffer2 = _interopRequireDefault(_TextSourceBuffer);

var _dashModelsDashManifestModel = require('../dash/models/DashManifestModel');

var _dashModelsDashManifestModel2 = _interopRequireDefault(_dashModelsDashManifestModel);

var _dashDashMetrics = require('../dash/DashMetrics');

var _dashDashMetrics2 = _interopRequireDefault(_dashDashMetrics);

var _dashControllersRepresentationController = require('../dash/controllers/RepresentationController');

var _dashControllersRepresentationController2 = _interopRequireDefault(_dashControllersRepresentationController);

var _utilsErrorHandler = require('./utils/ErrorHandler');

var _utilsErrorHandler2 = _interopRequireDefault(_utilsErrorHandler);

var _coreFactoryMaker = require('../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

function StreamProcessor(config) {

    var context = this.context;

    var indexHandler = config.indexHandler;
    var timelineConverter = config.timelineConverter;
    var adapter = config.adapter;
    var manifestModel = config.manifestModel;

    var instance = undefined,
        dynamic = undefined,
        mediaInfo = undefined,
        type = undefined,
        mediaInfoArr = undefined,
        stream = undefined,
        eventController = undefined,
        abrController = undefined,
        bufferController = undefined,
        scheduleController = undefined,
        representationController = undefined,
        fragmentController = undefined,
        fragmentLoader = undefined,
        fragmentModel = undefined;

    function setup() {
        mediaInfoArr = [];
    }

    function initialize(Type, FragmentController, mediaSource, Stream, EventController) {

        type = Type;
        stream = Stream;
        eventController = EventController;
        fragmentController = FragmentController;
        dynamic = stream.getStreamInfo().manifestInfo.isDynamic;

        indexHandler.initialize(this);

        abrController = (0, _controllersAbrController2['default'])(context).getInstance();
        abrController.initialize(type, this);

        bufferController = createBufferControllerForType(Type);
        scheduleController = (0, _controllersScheduleController2['default'])(context).create({
            metricsModel: (0, _modelsMetricsModel2['default'])(context).getInstance(),
            manifestModel: manifestModel,
            adapter: adapter,
            dashMetrics: (0, _dashDashMetrics2['default'])(context).getInstance(),
            dashManifestModel: (0, _dashModelsDashManifestModel2['default'])(context).getInstance(),
            timelineConverter: timelineConverter,
            rulesController: (0, _rulesRulesController2['default'])(context).getInstance(),
            mediaPlayerModel: (0, _modelsMediaPlayerModel2['default'])(context).getInstance()
        });

        bufferController.initialize(type, mediaSource, this);
        scheduleController.initialize(type, this);

        fragmentLoader = (0, _FragmentLoader2['default'])(context).create({
            metricsModel: (0, _modelsMetricsModel2['default'])(context).getInstance(),
            errHandler: (0, _utilsErrorHandler2['default'])(context).getInstance(),
            requestModifier: (0, _utilsRequestModifier2['default'])(context).getInstance()
        });

        fragmentModel = scheduleController.getFragmentModel();
        fragmentModel.setLoader(fragmentLoader);

        representationController = (0, _dashControllersRepresentationController2['default'])(context).create();
        representationController.initialize(this);
    }

    function reset(errored) {

        indexHandler.reset();

        if (bufferController) {
            bufferController.reset(errored);
            bufferController = null;
        }

        if (scheduleController) {
            scheduleController.reset();
            scheduleController = null;
        }

        if (representationController) {
            representationController.reset();
            representationController = null;
        }

        fragmentController = null;
        fragmentLoader = null;

        eventController = null;
        stream = null;
        dynamic = null;
        mediaInfo = null;
        mediaInfoArr = [];
        type = null;
    }

    function isUpdating() {
        return representationController.isUpdating();
    }

    function getType() {
        return type;
    }

    function getABRController() {
        return abrController;
    }

    function getRepresentationController() {
        return representationController;
    }

    function getFragmentLoader() {
        return fragmentLoader;
    }

    function getIndexHandler() {
        return indexHandler;
    }

    function getFragmentController() {
        return fragmentController;
    }

    function getBuffer() {
        return bufferController.getBuffer();
    }

    function setBuffer(buffer) {
        bufferController.setBuffer(buffer);
    }

    function getBufferController() {
        return bufferController;
    }

    function getFragmentModel() {
        return fragmentModel;
    }

    function getStreamInfo() {
        return stream.getStreamInfo();
    }

    function updateMediaInfo(manifest, newMediaInfo) {
        if (newMediaInfo !== mediaInfo && (!newMediaInfo || !mediaInfo || newMediaInfo.type === mediaInfo.type)) {
            mediaInfo = newMediaInfo;
        }
        if (mediaInfoArr.indexOf(newMediaInfo) === -1) {
            mediaInfoArr.push(newMediaInfo);
        }
        adapter.updateData(manifest, this);
    }

    function getMediaInfoArr() {
        return mediaInfoArr;
    }

    function getMediaInfo() {
        return mediaInfo;
    }

    function getMediaSource() {
        return bufferController.getMediaSource();
    }

    function getScheduleController() {
        return scheduleController;
    }

    function getEventController() {
        return eventController;
    }

    function start() {
        scheduleController.start();
    }

    function stop() {
        scheduleController.stop();
    }

    function getCurrentRepresentationInfo() {
        return adapter.getCurrentRepresentationInfo(manifestModel.getValue(), representationController);
    }

    function getRepresentationInfoForQuality(quality) {
        return adapter.getRepresentationInfoForQuality(manifestModel.getValue(), representationController, quality);
    }

    function isBufferingCompleted() {
        return bufferController.getIsBufferingCompleted();
    }

    function createBuffer() {
        return bufferController.getBuffer() || bufferController.createBuffer(mediaInfo);
    }

    function isDynamic() {
        return dynamic;
    }

    function createBufferControllerForType(type) {
        var controller = null;

        if (type === 'video' || type === 'audio' || type === 'fragmentedText') {
            controller = (0, _controllersBufferController2['default'])(context).create({
                metricsModel: (0, _modelsMetricsModel2['default'])(context).getInstance(),
                manifestModel: manifestModel,
                sourceBufferController: (0, _controllersSourceBufferController2['default'])(context).getInstance(),
                errHandler: (0, _utilsErrorHandler2['default'])(context).getInstance(),
                streamController: (0, _controllersStreamController2['default'])(context).getInstance(),
                mediaController: (0, _controllersMediaController2['default'])(context).getInstance(),
                adapter: adapter,
                textSourceBuffer: (0, _TextSourceBuffer2['default'])(context).getInstance()
            });
        } else {
            controller = (0, _controllersTextController2['default'])(context).create({
                errHandler: (0, _utilsErrorHandler2['default'])(context).getInstance(),
                sourceBufferController: (0, _controllersSourceBufferController2['default'])(context).getInstance()
            });
        }

        return controller;
    }

    instance = {
        initialize: initialize,
        isUpdating: isUpdating,
        getType: getType,
        getBufferController: getBufferController,
        getABRController: getABRController,
        getFragmentLoader: getFragmentLoader,
        getFragmentModel: getFragmentModel,
        getScheduleController: getScheduleController,
        getEventController: getEventController,
        getFragmentController: getFragmentController,
        getRepresentationController: getRepresentationController,
        getIndexHandler: getIndexHandler,
        getCurrentRepresentationInfo: getCurrentRepresentationInfo,
        getRepresentationInfoForQuality: getRepresentationInfoForQuality,
        isBufferingCompleted: isBufferingCompleted,
        createBuffer: createBuffer,
        getStreamInfo: getStreamInfo,
        updateMediaInfo: updateMediaInfo,
        getMediaInfoArr: getMediaInfoArr,
        getMediaInfo: getMediaInfo,
        getMediaSource: getMediaSource,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        start: start,
        stop: stop,
        isDynamic: isDynamic,
        reset: reset
    };

    setup();
    return instance;
}
StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(StreamProcessor);
module.exports = exports['default'];
//# sourceMappingURL=StreamProcessor.js.map
