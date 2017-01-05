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

var _utilsLiveEdgeFinder = require('./utils/LiveEdgeFinder');

var _utilsLiveEdgeFinder2 = _interopRequireDefault(_utilsLiveEdgeFinder);

var _StreamProcessor = require('./StreamProcessor');

var _StreamProcessor2 = _interopRequireDefault(_StreamProcessor);

var _controllersMediaController = require('./controllers/MediaController');

var _controllersMediaController2 = _interopRequireDefault(_controllersMediaController);

var _controllersEventController = require('./controllers/EventController');

var _controllersEventController2 = _interopRequireDefault(_controllersEventController);

var _controllersFragmentController = require('./controllers/FragmentController');

var _controllersFragmentController2 = _interopRequireDefault(_controllersFragmentController);

var _controllersAbrController = require('./controllers/AbrController');

var _controllersAbrController2 = _interopRequireDefault(_controllersAbrController);

var _modelsVideoModel = require('./models/VideoModel');

var _modelsVideoModel2 = _interopRequireDefault(_modelsVideoModel);

var _modelsMetricsModel = require('./models/MetricsModel');

var _modelsMetricsModel2 = _interopRequireDefault(_modelsMetricsModel);

var _controllersPlaybackController = require('./controllers/PlaybackController');

var _controllersPlaybackController2 = _interopRequireDefault(_controllersPlaybackController);

var _dashDashHandler = require('../dash/DashHandler');

var _dashDashHandler2 = _interopRequireDefault(_dashDashHandler);

var _dashSegmentBaseLoader = require('../dash/SegmentBaseLoader');

var _dashSegmentBaseLoader2 = _interopRequireDefault(_dashSegmentBaseLoader);

var _dashWebmSegmentBaseLoader = require('../dash/WebmSegmentBaseLoader');

var _dashWebmSegmentBaseLoader2 = _interopRequireDefault(_dashWebmSegmentBaseLoader);

var _dashDashMetrics = require('../dash/DashMetrics');

var _dashDashMetrics2 = _interopRequireDefault(_dashDashMetrics);

var _coreEventBus = require('../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreDebug = require('../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var _coreFactoryMaker = require('../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _TextSourceBuffer = require('./TextSourceBuffer');

var _TextSourceBuffer2 = _interopRequireDefault(_TextSourceBuffer);

function Stream(config) {

    var DATA_UPDATE_FAILED_ERROR_CODE = 1;

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var manifestModel = config.manifestModel;
    var manifestUpdater = config.manifestUpdater;
    var adapter = config.adapter;
    var capabilities = config.capabilities;
    var errHandler = config.errHandler;
    var timelineConverter = config.timelineConverter;
    var baseURLController = config.baseURLController;

    var instance = undefined,
        streamProcessors = undefined,
        isStreamActivated = undefined,
        isMediaInitialized = undefined,
        streamInfo = undefined,
        updateError = undefined,
        isUpdating = undefined,
        initialized = undefined,
        protectionController = undefined,
        liveEdgeFinder = undefined,
        playbackController = undefined,
        mediaController = undefined,
        fragmentController = undefined,
        eventController = undefined,
        abrController = undefined,
        textSourceBuffer = undefined;

    function setup() {
        streamProcessors = [];
        isStreamActivated = false;
        isMediaInitialized = false;
        streamInfo = null;
        updateError = {};
        isUpdating = false;
        initialized = false;

        liveEdgeFinder = (0, _utilsLiveEdgeFinder2['default'])(context).getInstance();
        playbackController = (0, _controllersPlaybackController2['default'])(context).getInstance();
        abrController = (0, _controllersAbrController2['default'])(context).getInstance();
        mediaController = (0, _controllersMediaController2['default'])(context).getInstance();
        fragmentController = (0, _controllersFragmentController2['default'])(context).create();
        textSourceBuffer = (0, _TextSourceBuffer2['default'])(context).getInstance();

        eventBus.on(_coreEventsEvents2['default'].BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.on(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    function initialize(StreamInfo, ProtectionController) {
        streamInfo = StreamInfo;
        protectionController = ProtectionController;
        if (protectionController) {
            eventBus.on(_coreEventsEvents2['default'].KEY_ERROR, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].KEY_SYSTEM_SELECTED, onProtectionError, instance);
            eventBus.on(_coreEventsEvents2['default'].KEY_SESSION_CREATED, onProtectionError, instance);
        }
    }

    /**
     * Activates Stream by re-initializing some of its components
     * @param {MediaSource} mediaSource
     * @memberof Stream#
     */
    function activate(mediaSource) {
        if (!isStreamActivated) {
            eventBus.on(_coreEventsEvents2['default'].CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
            initializeMedia(mediaSource);
        } else {
            createBuffers();
        }
    }

    /**
     * Partially resets some of the Stream elements
     * @memberof Stream#
     */
    function deactivate() {
        var ln = streamProcessors.length;
        for (var i = 0; i < ln; i++) {
            streamProcessors[i].reset();
        }
        streamProcessors = [];
        isStreamActivated = false;
        isMediaInitialized = false;
        clearEventController();
        eventBus.off(_coreEventsEvents2['default'].CURRENT_TRACK_CHANGED, onCurrentTrackChanged, instance);
    }

    function reset() {

        if (playbackController) {
            playbackController.pause();
            playbackController = null;
        }

        if (fragmentController) {
            fragmentController.reset();
            fragmentController = null;
        }

        liveEdgeFinder.abortSearch();
        deactivate();

        mediaController = null;
        abrController = null;
        manifestUpdater = null;
        manifestModel = null;
        adapter = null;
        capabilities = null;
        log = null;
        errHandler = null;
        isUpdating = false;
        initialized = false;
        updateError = {};

        eventBus.off(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(_coreEventsEvents2['default'].BUFFERING_COMPLETED, onBufferingCompleted, instance);
        eventBus.off(_coreEventsEvents2['default'].KEY_ERROR, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].SERVER_CERTIFICATE_UPDATED, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].LICENSE_REQUEST_COMPLETE, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].KEY_SYSTEM_SELECTED, onProtectionError, instance);
        eventBus.off(_coreEventsEvents2['default'].KEY_SESSION_CREATED, onProtectionError, instance);
    }

    function getDuration() {
        return streamInfo.duration;
    }

    function getStartTime() {
        return streamInfo.start;
    }

    function getStreamIndex() {
        return streamInfo.index;
    }

    function getId() {
        return streamInfo.id;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function hasMedia(type) {
        return getMediaInfo(type) !== null;
    }

    /**
     * @param {string} type
     * @returns {Array}
     * @memberof Stream#
     */
    function getBitrateListFor(type) {
        var mediaInfo = getMediaInfo(type);
        return abrController.getBitrateList(mediaInfo);
    }

    function startEventController() {
        if (eventController) {
            eventController.start();
        }
    }

    function clearEventController() {
        if (eventController) {
            eventController.clear();
        }
    }

    function isActivated() {
        return isStreamActivated;
    }

    function isInitialized() {
        return initialized;
    }

    function onProtectionError(event) {
        if (event.error) {
            errHandler.mediaKeySessionError(event.error);
            log(event.error);
            reset();
        }
    }

    function getMimeTypeOrType(mediaInfo) {
        return mediaInfo.type === 'text' ? mediaInfo.mimeType : mediaInfo.type;
    }

    function isMediaSupported(mediaInfo, mediaSource, manifest) {
        var type = mediaInfo.type;
        var codec, msg;

        if (type === 'muxed' && mediaInfo) {
            msg = 'Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines';
            log(msg);
            errHandler.manifestError(msg, 'multiplexedrep', manifestModel.getValue());
            return false;
        }

        if (type === 'text' || type === 'fragmentedText' || type === 'embeddedText') return true;

        codec = mediaInfo.codec;
        log(type + ' codec: ' + codec);

        if (!!mediaInfo.contentProtection && !capabilities.supportsEncryptedMedia()) {
            errHandler.capabilityError('encryptedmedia');
        } else if (!capabilities.supportsCodec((0, _modelsVideoModel2['default'])(context).getInstance().getElement(), codec)) {
            msg = type + 'Codec (' + codec + ') is not supported.';
            errHandler.manifestError(msg, 'codec', manifest);
            log(msg);
            return false;
        }

        return true;
    }

    function onCurrentTrackChanged(e) {
        if (e.newMediaInfo.streamInfo.id !== streamInfo.id) return;

        var processor = getProcessorForMediaInfo(e.oldMediaInfo);
        if (!processor) return;

        var currentTime = playbackController.getTime();
        var buffer = processor.getBuffer();
        var mediaInfo = e.newMediaInfo;
        var manifest = manifestModel.getValue();
        var idx = streamProcessors.indexOf(processor);
        var mediaSource = processor.getMediaSource();

        if (mediaInfo.type !== 'fragmentedText') {
            processor.reset(true);
            createStreamProcessor(mediaInfo, manifest, mediaSource, { buffer: buffer, replaceIdx: idx, currentTime: currentTime });
            playbackController.seek(playbackController.getTime());
        } else {
            processor.updateMediaInfo(manifest, mediaInfo);
        }
    }

    function isWebM(mimeType) {
        var type = mimeType.split('/')[1];

        return 'webm' === type.toLowerCase();
    }

    function createIndexHandler(mediaInfo) {

        var segmentBaseLoader = isWebM(mediaInfo.mimeType) ? (0, _dashWebmSegmentBaseLoader2['default'])(context).getInstance() : (0, _dashSegmentBaseLoader2['default'])(context).getInstance();
        segmentBaseLoader.setConfig({
            baseURLController: baseURLController,
            metricsModel: (0, _modelsMetricsModel2['default'])(context).getInstance()
        });
        segmentBaseLoader.initialize();

        var handler = (0, _dashDashHandler2['default'])(context).create({
            segmentBaseLoader: segmentBaseLoader,
            timelineConverter: timelineConverter,
            dashMetrics: (0, _dashDashMetrics2['default'])(context).getInstance(),
            metricsModel: (0, _modelsMetricsModel2['default'])(context).getInstance(),
            baseURLController: baseURLController
        });

        return handler;
    }

    function createStreamProcessor(mediaInfo, manifest, mediaSource, optionalSettings) {
        var streamProcessor = (0, _StreamProcessor2['default'])(context).create({
            indexHandler: createIndexHandler(mediaInfo),
            timelineConverter: timelineConverter,
            adapter: adapter,
            manifestModel: manifestModel
        });

        var allMediaForType = adapter.getAllMediaInfoForType(manifest, streamInfo, mediaInfo.type);
        streamProcessor.initialize(getMimeTypeOrType(mediaInfo), fragmentController, mediaSource, instance, eventController);
        abrController.updateTopQualityIndex(mediaInfo);

        if (optionalSettings) {
            streamProcessor.setBuffer(optionalSettings.buffer);
            streamProcessor.getIndexHandler().setCurrentTime(optionalSettings.currentTime);
            streamProcessors[optionalSettings.replaceIdx] = streamProcessor;
        } else {
            streamProcessors.push(streamProcessor);
        }

        if (mediaInfo.type === 'text' || mediaInfo.type === 'fragmentedText') {
            var idx;
            for (var i = 0; i < allMediaForType.length; i++) {
                if (allMediaForType[i].index === mediaInfo.index) {
                    idx = i;
                }
                streamProcessor.updateMediaInfo(manifest, allMediaForType[i]); //creates text tracks for all adaptations in one stream processor
            }
            if (mediaInfo.type === 'fragmentedText') {
                streamProcessor.updateMediaInfo(manifest, allMediaForType[idx]); //sets the initial media info
            }
        } else {
                streamProcessor.updateMediaInfo(manifest, mediaInfo);
            }

        return streamProcessor;
    }

    function initializeMediaForType(type, mediaSource) {
        var manifest = manifestModel.getValue();
        var allMediaForType = adapter.getAllMediaInfoForType(manifest, streamInfo, type);

        var mediaInfo = null;
        var initialMediaInfo;

        if (!allMediaForType || allMediaForType.length === 0) {
            log('No ' + type + ' data.');
            return;
        }

        for (var i = 0, ln = allMediaForType.length; i < ln; i++) {
            mediaInfo = allMediaForType[i];

            if (type === 'embeddedText') {
                textSourceBuffer.addEmbeddedTrack(mediaInfo);
            } else {
                if (!isMediaSupported(mediaInfo, mediaSource, manifest)) continue;

                if (mediaController.isMultiTrackSupportedByType(mediaInfo.type)) {
                    mediaController.addTrack(mediaInfo, streamInfo);
                }
            }
        }

        if (type === 'embeddedText' || mediaController.getTracksFor(type, streamInfo).length === 0) {
            return;
        }

        mediaController.checkInitialMediaSettingsForType(type, streamInfo);
        initialMediaInfo = mediaController.getCurrentTrackFor(type, streamInfo);

        // TODO : How to tell index handler live/duration?
        // TODO : Pass to controller and then pass to each method on handler?

        createStreamProcessor(initialMediaInfo, manifest, mediaSource);
    }

    function initializeMedia(mediaSource) {
        var manifest = manifestModel.getValue();
        var events;

        eventController = (0, _controllersEventController2['default'])(context).getInstance();
        eventController.initialize();
        eventController.setConfig({
            manifestModel: manifestModel,
            manifestUpdater: manifestUpdater
        });
        events = adapter.getEventsFor(manifest, streamInfo);
        eventController.addInlineEvents(events);

        isUpdating = true;
        initializeMediaForType('video', mediaSource);
        initializeMediaForType('audio', mediaSource);
        initializeMediaForType('text', mediaSource);
        initializeMediaForType('fragmentedText', mediaSource);
        initializeMediaForType('embeddedText', mediaSource);
        initializeMediaForType('muxed', mediaSource);

        createBuffers();

        //TODO. Consider initialization of TextSourceBuffer here if embeddedText, but no sideloadedText.

        isMediaInitialized = true;
        isUpdating = false;

        if (streamProcessors.length === 0) {
            var msg = 'No streams to play.';
            errHandler.manifestError(msg, 'nostreams', manifest);
            log(msg);
        } else {
            liveEdgeFinder.initialize(timelineConverter, streamProcessors[0]);
            //log("Playback initialized!");
            checkIfInitializationCompleted();
        }
    }

    function checkIfInitializationCompleted() {
        var ln = streamProcessors.length;
        var hasError = !!updateError.audio || !!updateError.video;
        var error = hasError ? new Error(DATA_UPDATE_FAILED_ERROR_CODE, 'Data update failed', null) : null;
        var i = 0;

        for (i; i < ln; i++) {
            if (streamProcessors[i].isUpdating() || isUpdating) return;
        }

        initialized = true;
        isStreamActivated = true;
        if (!isMediaInitialized) return;
        if (protectionController) {
            protectionController.initialize(manifestModel.getValue(), getMediaInfo('audio'), getMediaInfo('video'));
        }
        eventBus.trigger(_coreEventsEvents2['default'].STREAM_INITIALIZED, { streamInfo: streamInfo, error: error });
    }

    function getMediaInfo(type) {
        var ln = streamProcessors.length;
        var mediaCtrl = null;

        for (var i = 0; i < ln; i++) {
            mediaCtrl = streamProcessors[i];

            if (mediaCtrl.getType() === type) return mediaCtrl.getMediaInfo();
        }

        return null;
    }

    function createBuffers() {
        for (var i = 0, ln = streamProcessors.length; i < ln; i++) {
            streamProcessors[i].createBuffer();
        }
    }

    function onBufferingCompleted(e) {
        if (e.streamInfo !== streamInfo) return;

        var processors = getProcessors();
        var ln = processors.length;
        var i = 0;

        // if there is at least one buffer controller that has not completed buffering yet do nothing
        for (i; i < ln; i++) {
            if (!processors[i].isBufferingCompleted()) return;
        }

        eventBus.trigger(_coreEventsEvents2['default'].STREAM_BUFFERING_COMPLETED, { streamInfo: streamInfo });
    }

    function onDataUpdateCompleted(e) {
        var sp = e.sender.getStreamProcessor();

        if (sp.getStreamInfo() !== streamInfo) return;

        updateError[sp.getType()] = e.error;
        checkIfInitializationCompleted();
    }

    function getProcessorForMediaInfo(mediaInfo) {
        if (!mediaInfo) return false;

        var processors = getProcessors();

        return processors.filter(function (processor) {
            return processor.getType() === mediaInfo.type;
        })[0];
    }

    function getProcessors() {
        var ln = streamProcessors.length;
        var arr = [];
        var i = 0;

        var type, controller;

        for (i; i < ln; i++) {
            controller = streamProcessors[i];
            type = controller.getType();

            if (type === 'audio' || type === 'video' || type === 'fragmentedText') {
                arr.push(controller);
            }
        }

        return arr;
    }

    function updateData(updatedStreamInfo) {

        log('Manifest updated... updating data system wide.');

        var manifest = manifestModel.getValue();

        isStreamActivated = false;
        isUpdating = true;
        initialized = false;
        streamInfo = updatedStreamInfo;

        if (eventController) {
            var events = adapter.getEventsFor(manifest, streamInfo);
            eventController.addInlineEvents(events);
        }

        for (var i = 0, ln = streamProcessors.length; i < ln; i++) {
            var streamProcessor = streamProcessors[i];
            var mediaInfo = adapter.getMediaInfoForType(manifest, streamInfo, streamProcessor.getType());
            abrController.updateTopQualityIndex(mediaInfo);
            streamProcessor.updateMediaInfo(manifest, mediaInfo);
        }

        isUpdating = false;
        checkIfInitializationCompleted();
    }

    instance = {
        initialize: initialize,
        activate: activate,
        deactivate: deactivate,
        getDuration: getDuration,
        getStartTime: getStartTime,
        getStreamIndex: getStreamIndex,
        getId: getId,
        getStreamInfo: getStreamInfo,
        hasMedia: hasMedia,
        getBitrateListFor: getBitrateListFor,
        startEventController: startEventController,
        isActivated: isActivated,
        isInitialized: isInitialized,
        updateData: updateData,
        reset: reset,
        getProcessors: getProcessors
    };

    setup();
    return instance;
}

Stream.__dashjs_factory_name = 'Stream';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(Stream);
module.exports = exports['default'];
//# sourceMappingURL=Stream.js.map
