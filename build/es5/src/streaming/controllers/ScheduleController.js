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

var _voMetricsPlayList = require('../vo/metrics/PlayList');

var _PlaybackController = require('./PlaybackController');

var _PlaybackController2 = _interopRequireDefault(_PlaybackController);

var _AbrController = require('./AbrController');

var _AbrController2 = _interopRequireDefault(_AbrController);

var _BufferController = require('./BufferController');

var _BufferController2 = _interopRequireDefault(_BufferController);

var _MediaController = require('./MediaController');

var _MediaController2 = _interopRequireDefault(_MediaController);

var _rulesSchedulingBufferLevelRule = require('../rules/scheduling/BufferLevelRule');

var _rulesSchedulingBufferLevelRule2 = _interopRequireDefault(_rulesSchedulingBufferLevelRule);

var _rulesSchedulingNextFragmentRequestRule = require('../rules/scheduling/NextFragmentRequestRule');

var _rulesSchedulingNextFragmentRequestRule2 = _interopRequireDefault(_rulesSchedulingNextFragmentRequestRule);

var _TextSourceBuffer = require('../TextSourceBuffer');

var _TextSourceBuffer2 = _interopRequireDefault(_TextSourceBuffer);

var _modelsMetricsModel = require('../models/MetricsModel');

var _modelsMetricsModel2 = _interopRequireDefault(_modelsMetricsModel);

var _modelsFragmentModel = require('../models/FragmentModel');

var _modelsFragmentModel2 = _interopRequireDefault(_modelsFragmentModel);

var _dashDashMetrics = require('../../dash/DashMetrics');

var _dashDashMetrics2 = _interopRequireDefault(_dashDashMetrics);

var _dashDashAdapter = require('../../dash/DashAdapter');

var _dashDashAdapter2 = _interopRequireDefault(_dashDashAdapter);

var _controllersSourceBufferController = require('../controllers/SourceBufferController');

var _controllersSourceBufferController2 = _interopRequireDefault(_controllersSourceBufferController);

var _utilsLiveEdgeFinder = require('../utils/LiveEdgeFinder');

var _utilsLiveEdgeFinder2 = _interopRequireDefault(_utilsLiveEdgeFinder);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _controllersStreamController = require('../controllers/StreamController');

var _controllersStreamController2 = _interopRequireDefault(_controllersStreamController);

var _coreDebug = require('../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

function ScheduleController(config) {

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();
    var metricsModel = config.metricsModel;
    var manifestModel = config.manifestModel;
    var adapter = config.adapter;
    var dashMetrics = config.dashMetrics;
    var dashManifestModel = config.dashManifestModel;
    var timelineConverter = config.timelineConverter;
    var mediaPlayerModel = config.mediaPlayerModel;

    var instance = undefined,
        type = undefined,
        ready = undefined,
        fragmentModel = undefined,
        isDynamic = undefined,
        currentRepresentationInfo = undefined,
        initialPlayback = undefined,
        isStopped = undefined,
        playListMetrics = undefined,
        playListTraceMetrics = undefined,
        playListTraceMetricsClosed = undefined,
        isFragmentProcessingInProgress = undefined,
        timeToLoadDelay = undefined,
        scheduleTimeout = undefined,
        seekTarget = undefined,
        playbackController = undefined,
        mediaController = undefined,
        abrController = undefined,
        streamProcessor = undefined,
        streamController = undefined,
        fragmentController = undefined,
        liveEdgeFinder = undefined,
        bufferController = undefined,
        bufferLevelRule = undefined,
        nextFragmentRequestRule = undefined,
        scheduleWhilePaused = undefined,
        lastQualityIndex = undefined,
        lastInitQuality = undefined,
        replaceRequestArray = undefined;

    function setup() {
        initialPlayback = true;
        lastInitQuality = NaN;
        lastQualityIndex = NaN;
        replaceRequestArray = [];
        isStopped = false;
        playListMetrics = null;
        playListTraceMetrics = null;
        playListTraceMetricsClosed = true;
        isFragmentProcessingInProgress = false;
        timeToLoadDelay = 0;
        seekTarget = NaN;
    }

    function initialize(Type, StreamProcessor) {
        type = Type;
        streamProcessor = StreamProcessor;
        liveEdgeFinder = (0, _utilsLiveEdgeFinder2['default'])(context).getInstance();
        playbackController = (0, _PlaybackController2['default'])(context).getInstance();
        mediaController = (0, _MediaController2['default'])(context).getInstance();
        abrController = (0, _AbrController2['default'])(context).getInstance();
        streamController = (0, _controllersStreamController2['default'])(context).getInstance();
        fragmentController = streamProcessor.getFragmentController();
        bufferController = streamProcessor.getBufferController();
        fragmentModel = fragmentController.getModel(type);
        fragmentModel.setScheduleController(this);
        isDynamic = streamProcessor.isDynamic();
        scheduleWhilePaused = mediaPlayerModel.getScheduleWhilePaused();

        bufferLevelRule = (0, _rulesSchedulingBufferLevelRule2['default'])(context).create({
            dashMetrics: (0, _dashDashMetrics2['default'])(context).getInstance(),
            metricsModel: (0, _modelsMetricsModel2['default'])(context).getInstance(),
            textSourceBuffer: (0, _TextSourceBuffer2['default'])(context).getInstance()
        });

        nextFragmentRequestRule = (0, _rulesSchedulingNextFragmentRequestRule2['default'])(context).create({
            adapter: (0, _dashDashAdapter2['default'])(context).getInstance(),
            sourceBufferController: (0, _controllersSourceBufferController2['default'])(context).getInstance(),
            textSourceBuffer: (0, _TextSourceBuffer2['default'])(context).getInstance()

        });

        if (dashManifestModel.getIsTextTrack(type)) {
            eventBus.on(_coreEventsEvents2['default'].TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        eventBus.on(_coreEventsEvents2['default'].LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.on(_coreEventsEvents2['default'].DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.on(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].STREAM_INITIALIZED, onStreamInitialized, this);
        eventBus.on(_coreEventsEvents2['default'].BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.on(_coreEventsEvents2['default'].BUFFER_CLEARED, onBufferCleared, this);
        eventBus.on(_coreEventsEvents2['default'].BYTES_APPENDED, onBytesAppended, this);
        eventBus.on(_coreEventsEvents2['default'].INIT_REQUESTED, onInitRequested, this);
        eventBus.on(_coreEventsEvents2['default'].QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.on(_coreEventsEvents2['default'].BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(_coreEventsEvents2['default'].URL_RESOLUTION_FAILED, onURLResolutionFailed, this);
        eventBus.on(_coreEventsEvents2['default'].FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, this);
    }

    function start() {
        if (!ready) return;
        addPlaylistTraceMetrics();
        isStopped = false;

        if (initialPlayback) {
            getInitRequest(currentRepresentationInfo.quality);
        } else {
            //schedule will be first called after the init segment is appended. But in the case where we stop and start
            //the ScheduleController E.g dateUpdate on manifest refresh for live streams. we need to start schedule again.
            startScheduleTimer(0);
        }

        if (initialPlayback) {
            initialPlayback = false;
        }
        log('Schedule controller starting for ' + type);
    }

    function stop() {
        if (isStopped) return;
        isStopped = true;
        clearTimeout(scheduleTimeout);
        log('Schedule controller stopping for ' + type);
    }

    function schedule() {

        if (isStopped || isFragmentProcessingInProgress || !bufferController || playbackController.isPaused() && !scheduleWhilePaused) return;

        validateExecutedFragmentRequest();

        var isReplacement = replaceRequestArray.length > 0;
        var readyToLoad = bufferLevelRule.execute(streamProcessor, type, streamController.isVideoTrackPresent());

        if (readyToLoad || isReplacement) {
            var getNextFragment = function getNextFragment() {
                if (currentRepresentationInfo.quality !== lastInitQuality) {
                    lastInitQuality = currentRepresentationInfo.quality;
                    bufferController.switchInitData(streamProcessor.getStreamInfo().id, currentRepresentationInfo.quality);
                } else {

                    var request = nextFragmentRequestRule.execute(streamProcessor, replaceRequestArray.shift());
                    if (request) {
                        fragmentModel.executeRequest(request);
                    } else {
                        //Use case - Playing at the bleeding live edge and frag is not available yet. Cycle back around.
                        isFragmentProcessingInProgress = false;
                        startScheduleTimer(250);
                    }
                }
            };

            isFragmentProcessingInProgress = true;
            if (isReplacement) {
                getNextFragment();
            } else {
                abrController.getPlaybackQuality(streamProcessor, getNextFragment);
            }
        } else {
            startScheduleTimer(500);
        }
    }

    function validateExecutedFragmentRequest() {
        //Validate that the fragment request executed and appended into the source buffer is as
        // good of quality as the current quality and is the correct media track.
        var safeBufferLevel = currentRepresentationInfo.fragmentDuration * 1.5;
        var request = fragmentModel.getRequests({ state: _modelsFragmentModel2['default'].FRAGMENT_MODEL_EXECUTED, time: playbackController.getTime() + safeBufferLevel, threshold: 0 })[0];

        if (request && replaceRequestArray.indexOf(request) === -1 && !dashManifestModel.getIsTextTrack(type)) {
            if (!mediaController.isCurrentTrack(request.mediaInfo) || mediaPlayerModel.getFastSwitchEnabled() && request.quality < currentRepresentationInfo.quality && bufferController.getBufferLevel() >= safeBufferLevel && abrController.getAbandonmentStateFor(type) !== _AbrController2['default'].ABANDON_LOAD) {
                replaceRequest(request);
                log('Reloading outdated fragment at index: ', request.index);
            } else if (request.quality > currentRepresentationInfo.quality) {
                //The buffer has better quality it in then what we would request so set append point to end of buffer!!
                setSeekTarget(playbackController.getTime() + bufferController.getBufferLevel());
            }
        }
    }

    function startScheduleTimer(value) {
        clearTimeout(scheduleTimeout);
        scheduleTimeout = setTimeout(schedule, value);
    }

    function onInitRequested(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        getInitRequest(currentRepresentationInfo.quality);
    }

    function getInitRequest(quality) {
        lastInitQuality = quality;

        var request = adapter.getInitRequest(streamProcessor, quality);
        if (request) {
            isFragmentProcessingInProgress = true;
            fragmentModel.executeRequest(request);
        }
    }

    function replaceRequest(request) {
        replaceRequestArray.push(request);
    }

    function onQualityChanged(e) {
        if (type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        currentRepresentationInfo = streamProcessor.getRepresentationInfoForQuality(e.newQuality);

        if (currentRepresentationInfo === null || currentRepresentationInfo === undefined) {
            throw new Error('Unexpected error! - currentRepresentationInfo is null or undefined');
        }

        clearPlayListTraceMetrics(new Date(), _voMetricsPlayList.PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
        addPlaylistTraceMetrics();
    }

    function completeQualityChange(trigger) {
        var item = fragmentModel.getRequests({ state: _modelsFragmentModel2['default'].FRAGMENT_MODEL_EXECUTED, time: playbackController.getTime(), threshold: 0 })[0];
        if (item && playbackController.getTime() >= item.startTime) {
            if (item.quality !== lastQualityIndex && trigger) {
                eventBus.trigger(_coreEventsEvents2['default'].QUALITY_CHANGE_RENDERED, { mediaType: type, oldQuality: lastQualityIndex, newQuality: item.quality });
            }
            lastQualityIndex = item.quality;
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.error || e.sender.getStreamProcessor() !== streamProcessor) return;
        currentRepresentationInfo = adapter.convertDataToTrack(manifestModel.getValue(), e.currentRepresentation);
    }

    function onStreamInitialized(e) {
        if (e.error || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;
        currentRepresentationInfo = streamProcessor.getCurrentRepresentationInfo();
        if (!isDynamic || liveEdgeFinder.getLiveEdge() !== null) {
            ready = true;
        }
        if (isStopped) {
            start();
        }
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== fragmentModel) return;
        stop();
        isFragmentProcessingInProgress = false;
        log('Stream is complete');
    }

    function onFragmentLoadingCompleted(e) {
        if (e.sender !== fragmentModel) return;

        if (dashManifestModel.getIsTextTrack(type)) {
            isFragmentProcessingInProgress = false;
        }

        if (e.error && e.serviceLocation && !isStopped) {
            replaceRequest(e.request);
        }
    }

    function onPlaybackTimeUpdated() {
        completeQualityChange(true);
    }

    function onBytesAppended(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        isFragmentProcessingInProgress = false;
        startScheduleTimer(0);
    }

    function onFragmentLoadingAbandoned(e) {
        if (e.streamProcessor !== streamProcessor) return;
        replaceRequest(e.request);
        isFragmentProcessingInProgress = false;
        startScheduleTimer(0);
    }

    function onDataUpdateStarted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        stop();
    }

    function onBufferCleared(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        // after the data has been removed from the buffer we should remove the requests from the list of
        // the executed requests for which playback time is inside the time interval that has been removed from the buffer
        fragmentModel.removeExecutedRequestsBeforeTime(e.to);

        if (e.hasEnoughSpaceToAppend && !bufferController.getIsBufferingCompleted() && isStopped) {
            start();
        }
    }

    function onBufferLevelStateChanged(e) {
        if (e.sender.getStreamProcessor() === streamProcessor && e.state === _BufferController2['default'].BUFFER_EMPTY && !playbackController.isSeeking()) {
            log('Buffer is empty! Stalling!');
            clearPlayListTraceMetrics(new Date(), _voMetricsPlayList.PlayListTrace.REBUFFERING_REASON);
        }
    }

    function onQuotaExceeded(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        stop();
    }

    function onURLResolutionFailed() {
        fragmentModel.abortRequests();
        stop();
    }

    function onTimedTextRequested(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        getInitRequest(e.index);
    }

    function onPlaybackStarted() {
        if (isStopped) {
            start();
        }
    }

    function onPlaybackSeeking(e) {
        seekTarget = e.seekTime;
        setTimeToLoadDelay(0);

        if (isStopped) {
            start();
        }

        var manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor('stream'));
        var latency = currentRepresentationInfo.DVRWindow ? currentRepresentationInfo.DVRWindow.end - playbackController.getTime() : NaN;
        metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, { latency: latency });
    }

    function onPlaybackRateChanged(e) {
        if (playListTraceMetrics) {
            playListTraceMetrics.playbackspeed = e.playbackRate.toString();
        }
    }

    function onLiveEdgeSearchCompleted(e) {
        if (e.error) return;

        var dvrWindowSize = currentRepresentationInfo.mediaInfo.streamInfo.manifestInfo.DVRWindowSize / 2;
        var startTime = e.liveEdge - playbackController.computeLiveDelay(currentRepresentationInfo.fragmentDuration, dvrWindowSize);
        var manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor('stream'));
        var currentLiveStart = playbackController.getLiveStartTime();
        var request = adapter.getFragmentRequestForTime(streamProcessor, currentRepresentationInfo, startTime, { ignoreIsFinished: true });

        seekTarget = currentLiveStart;
        if (isNaN(currentLiveStart) || request.startTime > currentLiveStart) {
            playbackController.setLiveStartTime(request.startTime);
            seekTarget = request.startTime;
        }

        metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
            currentTime: seekTarget,
            presentationStartTime: e.liveEdge,
            latency: e.liveEdge - seekTarget,
            clientTimeOffset: timelineConverter.getClientTimeOffset()
        });

        ready = true;
        if (isStopped) {
            start();
        }
    }

    function getSeekTarget() {
        return seekTarget;
    }

    function setSeekTarget(value) {
        seekTarget = value;
    }

    function getFragmentModel() {
        return fragmentModel;
    }

    function setTimeToLoadDelay(value) {
        timeToLoadDelay = value;
    }

    function getTimeToLoadDelay() {
        return timeToLoadDelay;
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function getBufferTarget() {
        return bufferLevelRule.getBufferTarget(streamProcessor, type, streamController.isVideoTrackPresent());
    }

    function setPlayList(playList) {
        playListMetrics = playList;
    }

    function finalisePlayList(time, reason) {
        clearPlayListTraceMetrics(time, reason);
        playListMetrics = null;
    }

    function clearPlayListTraceMetrics(endTime, stopreason) {
        if (playListMetrics && playListTraceMetricsClosed === false) {
            var startTime = playListTraceMetrics.start;
            var duration = endTime.getTime() - startTime.getTime();
            playListTraceMetrics.duration = duration;
            playListTraceMetrics.stopreason = stopreason;
            playListMetrics.trace.push(playListTraceMetrics);
            playListTraceMetricsClosed = true;
        }
    }

    function addPlaylistTraceMetrics() {
        if (playListMetrics && playListTraceMetricsClosed === true && currentRepresentationInfo) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = new _voMetricsPlayList.PlayListTrace();
            playListTraceMetrics.representationid = currentRepresentationInfo.id;
            playListTraceMetrics.start = new Date();
            playListTraceMetrics.mstart = playbackController.getTime() * 1000;
            playListTraceMetrics.playbackspeed = playbackController.getPlaybackRate().toString();
        }
    }

    function reset() {
        eventBus.off(_coreEventsEvents2['default'].LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, this);
        eventBus.off(_coreEventsEvents2['default'].DATA_UPDATE_STARTED, onDataUpdateStarted, this);
        eventBus.off(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(_coreEventsEvents2['default'].BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, this);
        eventBus.off(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.off(_coreEventsEvents2['default'].FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.off(_coreEventsEvents2['default'].STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.off(_coreEventsEvents2['default'].STREAM_INITIALIZED, onStreamInitialized, this);
        eventBus.off(_coreEventsEvents2['default'].QUOTA_EXCEEDED, onQuotaExceeded, this);
        eventBus.off(_coreEventsEvents2['default'].BYTES_APPENDED, onBytesAppended, this);
        eventBus.off(_coreEventsEvents2['default'].BUFFER_CLEARED, onBufferCleared, this);
        eventBus.off(_coreEventsEvents2['default'].INIT_REQUESTED, onInitRequested, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(_coreEventsEvents2['default'].URL_RESOLUTION_FAILED, onURLResolutionFailed, this);
        eventBus.off(_coreEventsEvents2['default'].FRAGMENT_LOADING_ABANDONED, onFragmentLoadingAbandoned, this);
        if (dashManifestModel.getIsTextTrack(type)) {
            eventBus.off(_coreEventsEvents2['default'].TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        stop();
        completeQualityChange(false);
        isFragmentProcessingInProgress = false;
        timeToLoadDelay = 0;
        seekTarget = NaN;
        playbackController = null;
        playListMetrics = null;
    }

    instance = {
        initialize: initialize,
        getStreamProcessor: getStreamProcessor,
        getSeekTarget: getSeekTarget,
        setSeekTarget: setSeekTarget,
        getFragmentModel: getFragmentModel,
        setTimeToLoadDelay: setTimeToLoadDelay,
        getTimeToLoadDelay: getTimeToLoadDelay,
        replaceRequest: replaceRequest,
        start: start,
        stop: stop,
        reset: reset,
        setPlayList: setPlayList,
        getBufferTarget: getBufferTarget,
        finalisePlayList: finalisePlayList
    };

    setup();

    return instance;
}

ScheduleController.__dashjs_factory_name = 'ScheduleController';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(ScheduleController);
module.exports = exports['default'];
//# sourceMappingURL=ScheduleController.js.map
