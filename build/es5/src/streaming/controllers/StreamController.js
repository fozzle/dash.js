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

var _PlaybackController = require('./PlaybackController');

var _PlaybackController2 = _interopRequireDefault(_PlaybackController);

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _ManifestUpdater = require('../ManifestUpdater');

var _ManifestUpdater2 = _interopRequireDefault(_ManifestUpdater);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _modelsURIQueryAndFragmentModel = require('../models/URIQueryAndFragmentModel');

var _modelsURIQueryAndFragmentModel2 = _interopRequireDefault(_modelsURIQueryAndFragmentModel);

var _modelsVideoModel = require('../models/VideoModel');

var _modelsVideoModel2 = _interopRequireDefault(_modelsVideoModel);

var _modelsMediaPlayerModel = require('../models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _voMetricsPlayList = require('../vo/metrics/PlayList');

var _coreDebug = require('../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var _utilsInitCache = require('../utils/InitCache');

var _utilsInitCache2 = _interopRequireDefault(_utilsInitCache);

function StreamController() {

    var STREAM_END_THRESHOLD = 0.1;

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        capabilities = undefined,
        manifestUpdater = undefined,
        manifestLoader = undefined,
        manifestModel = undefined,
        dashManifestModel = undefined,
        adapter = undefined,
        metricsModel = undefined,
        dashMetrics = undefined,
        liveEdgeFinder = undefined,
        mediaSourceController = undefined,
        timeSyncController = undefined,
        baseURLController = undefined,
        initCache = undefined,
        errHandler = undefined,
        timelineConverter = undefined,
        streams = undefined,
        activeStream = undefined,
        protectionController = undefined,
        protectionData = undefined,
        autoPlay = undefined,
        isStreamSwitchingInProgress = undefined,
        isUpdating = undefined,
        hasMediaError = undefined,
        hasInitialisationError = undefined,
        mediaSource = undefined,
        videoModel = undefined,
        playbackController = undefined,
        mediaPlayerModel = undefined,
        isPaused = undefined,
        initialPlayback = undefined,
        playListMetrics = undefined,
        videoTrackDetected = undefined;

    function setup() {
        protectionController = null;
        streams = [];
        mediaPlayerModel = (0, _modelsMediaPlayerModel2['default'])(context).getInstance();
        autoPlay = true;
        isStreamSwitchingInProgress = false;
        isUpdating = false;
        isPaused = false;
        initialPlayback = true;
        playListMetrics = null;
        hasMediaError = false;
        hasInitialisationError = false;
    }

    function initialize(autoPl, protData) {
        autoPlay = autoPl;
        protectionData = protData;
        timelineConverter.initialize();
        initCache = (0, _utilsInitCache2['default'])(context).getInstance();

        manifestUpdater = (0, _ManifestUpdater2['default'])(context).getInstance();
        manifestUpdater.setConfig({
            log: log,
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel
        });
        manifestUpdater.initialize(manifestLoader);

        videoModel = (0, _modelsVideoModel2['default'])(context).getInstance();
        playbackController = (0, _PlaybackController2['default'])(context).getInstance();
        playbackController.setConfig({
            streamController: instance,
            timelineConverter: timelineConverter,
            metricsModel: metricsModel,
            dashMetrics: dashMetrics,
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            adapter: adapter,
            videoModel: videoModel
        });

        eventBus.on(_coreEventsEvents2['default'].TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_ENDED, onEnded, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(_coreEventsEvents2['default'].MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.on(_coreEventsEvents2['default'].STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
    }

    /*
     * Called when current playback position is changed.
     * Used to determine the time current stream is finished and we should switch to the next stream.
     */
    function onPlaybackTimeUpdated(e) {

        if (isVideoTrackPresent()) {
            var playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                metricsModel.addDroppedFrames('video', playbackQuality);
            }
        }

        // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new stream starts
        // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
        if (playbackController.isSeeking()) return;

        if (e.timeToEnd <= STREAM_END_THRESHOLD) {
            //only needed for multiple period content when the native event does not fire due to duration manipulation.
            onEnded();
        }
    }

    function onPlaybackSeeking(e) {
        var seekingStream = getStreamForTime(e.seekTime);

        if (seekingStream && seekingStream !== activeStream) {
            flushPlaylistMetrics(_voMetricsPlayList.PlayListTrace.END_OF_PERIOD_STOP_REASON);
            switchStream(activeStream, seekingStream, e.seekTime);
        } else {
            flushPlaylistMetrics(_voMetricsPlayList.PlayListTrace.USER_REQUEST_STOP_REASON);
        }

        addPlaylistMetrics(_voMetricsPlayList.PlayList.SEEK_START_REASON);
    }

    function onPlaybackStarted() /*e*/{
        if (initialPlayback) {
            initialPlayback = false;
            addPlaylistMetrics(_voMetricsPlayList.PlayList.INITIAL_PLAYOUT_START_REASON);
        } else {
            if (isPaused) {
                isPaused = false;
                addPlaylistMetrics(_voMetricsPlayList.PlayList.RESUME_FROM_PAUSE_START_REASON);
            }
        }
    }

    function onPlaybackPaused(e) {
        if (!e.ended) {
            isPaused = true;
            flushPlaylistMetrics(_voMetricsPlayList.PlayListTrace.USER_REQUEST_STOP_REASON);
        }
    }

    function onStreamBufferingCompleted() {
        var isLast = getActiveStreamInfo().isLast;
        if (mediaSource && isLast) {
            mediaSourceController.signalEndOfStream(mediaSource);
        }
    }

    function getStreamForTime(time) {
        var duration = 0;
        var stream = null;

        var ln = streams.length;

        if (ln > 0) {
            duration += streams[0].getStartTime();
        }

        for (var i = 0; i < ln; i++) {
            stream = streams[i];
            duration += stream.getDuration();

            if (time < duration) {
                return stream;
            }
        }

        return null;
    }

    /**
     * Returns a playhead time, in seconds, converted to be relative
     * to the start of an identified stream/period or null if no such stream
     * @param {number} time
     * @param {string} id
     * @returns {number|null}
     */
    function getTimeRelativeToStreamId(time, id) {
        var stream = null;
        var baseStart = 0;
        var streamStart = 0;
        var streamDur = null;

        var ln = streams.length;

        for (var i = 0; i < ln; i++) {
            stream = streams[i];
            streamStart = stream.getStartTime();
            streamDur = stream.getDuration();

            // use start time, if not undefined or NaN or similar
            if (Number.isFinite(streamStart)) {
                baseStart = streamStart;
            }

            if (stream.getId() === id) {
                return time - baseStart;
            } else {
                // use duration if not undefined or NaN or similar
                if (Number.isFinite(streamDur)) {
                    baseStart += streamDur;
                }
            }
        }

        return null;
    }

    function getActiveStreamCommonEarliestTime() {
        var commonEarliestTime = [];
        activeStream.getProcessors().forEach(function (p) {
            commonEarliestTime.push(p.getIndexHandler().getEarliestTime());
        });
        return Math.min.apply(Math, commonEarliestTime);
    }

    function onEnded() {
        var nextStream = getNextStream();
        if (nextStream) {
            switchStream(activeStream, nextStream, NaN);
        }
        flushPlaylistMetrics(nextStream ? _voMetricsPlayList.PlayListTrace.END_OF_PERIOD_STOP_REASON : _voMetricsPlayList.PlayListTrace.END_OF_CONTENT_STOP_REASON);
    }

    function getNextStream() {
        var start = activeStream.getStreamInfo().start;
        var duration = activeStream.getStreamInfo().duration;

        return streams.filter(function (stream) {
            return stream.getStreamInfo().start === start + duration;
        })[0];
    }

    function switchStream(oldStream, newStream, seekTime) {

        if (isStreamSwitchingInProgress || !newStream || oldStream === newStream) return;
        isStreamSwitchingInProgress = true;

        eventBus.trigger(_coreEventsEvents2['default'].PERIOD_SWITCH_STARTED, {
            fromStreamInfo: oldStream ? oldStream.getStreamInfo() : null,
            toStreamInfo: newStream.getStreamInfo()
        });

        if (oldStream) oldStream.deactivate();
        activeStream = newStream;
        playbackController.initialize(activeStream.getStreamInfo());
        videoTrackDetected = checkVideoPresence();

        //TODO detect if we should close and repose or jump to activateStream.
        openMediaSource(seekTime);
    }

    function openMediaSource(seekTime) {

        var sourceUrl = undefined;

        function onMediaSourceOpen() {
            log('MediaSource is open!');
            window.URL.revokeObjectURL(sourceUrl);
            mediaSource.removeEventListener('sourceopen', onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', onMediaSourceOpen);
            setMediaDuration();
            activateStream(seekTime);
        }

        if (!mediaSource) {
            mediaSource = mediaSourceController.createMediaSource();
        } else {
            mediaSourceController.detachMediaSource(videoModel);
        }

        mediaSource.addEventListener('sourceopen', onMediaSourceOpen, false);
        mediaSource.addEventListener('webkitsourceopen', onMediaSourceOpen, false);
        sourceUrl = mediaSourceController.attachMediaSource(mediaSource, videoModel);
        log('MediaSource attached to element.  Waiting on open...');
    }

    function activateStream(seekTime) {

        activeStream.activate(mediaSource);

        if (!initialPlayback) {
            if (!isNaN(seekTime)) {
                playbackController.seek(seekTime); //we only need to call seek here, IndexHandlerTime was set from seeking event
            } else {
                    (function () {
                        var startTime = playbackController.getStreamStartTime(true);
                        activeStream.getProcessors().forEach(function (p) {
                            adapter.setIndexHandlerTime(p, startTime);
                        });
                        playbackController.seek(startTime); //seek to period start time
                    })();
                }
        }

        activeStream.startEventController();
        if (autoPlay || !initialPlayback) {
            playbackController.play();
        }

        isStreamSwitchingInProgress = false;
        eventBus.trigger(_coreEventsEvents2['default'].PERIOD_SWITCH_COMPLETED, { toStreamInfo: activeStream.getStreamInfo() });
    }

    function setMediaDuration() {
        var manifestDuration = activeStream.getStreamInfo().manifestInfo.duration;
        var mediaDuration = mediaSourceController.setDuration(mediaSource, manifestDuration);
        log('Duration successfully set to: ' + mediaDuration);
    }

    function getComposedStream(streamInfo) {
        for (var i = 0, ln = streams.length; i < ln; i++) {
            if (streams[i].getId() === streamInfo.id) {
                return streams[i];
            }
        }
        return null;
    }

    function composeStreams(manifest) {

        try {
            var streamsInfo = adapter.getStreamsInfo(manifest);
            if (streamsInfo.length === 0) {
                throw new Error('There are no streams');
            }

            var manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor('stream'));
            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                currentTime: playbackController.getTime(),
                buffered: videoModel.getElement().buffered,
                presentationStartTime: streamsInfo[0].start,
                clientTimeOffset: timelineConverter.getClientTimeOffset()
            });

            for (var i = 0, ln = streamsInfo.length; i < ln; i++) {

                // If the Stream object does not exist we probably loaded the manifest the first time or it was
                // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                var streamInfo = streamsInfo[i];
                var stream = getComposedStream(streamInfo);

                if (!stream) {

                    stream = (0, _Stream2['default'])(context).create({
                        manifestModel: manifestModel,
                        manifestUpdater: manifestUpdater,
                        adapter: adapter,
                        timelineConverter: timelineConverter,
                        capabilities: capabilities,
                        errHandler: errHandler,
                        baseURLController: baseURLController
                    });
                    streams.push(stream);
                    stream.initialize(streamInfo, protectionController);
                } else {
                    stream.updateData(streamInfo);
                }

                metricsModel.addManifestUpdateStreamInfo(manifestUpdateInfo, streamInfo.id, streamInfo.index, streamInfo.start, streamInfo.duration);
            }

            if (!activeStream) {
                //const initStream = streamsInfo[0].manifestInfo.isDynamic ? streams[streams.length -1] : streams[0];
                //TODO we need to figure out what the correct starting period is here and not just go to first or last in array.
                switchStream(null, streams[0], NaN);
            }

            eventBus.trigger(_coreEventsEvents2['default'].STREAMS_COMPOSED);
        } catch (e) {
            errHandler.manifestError(e.message, 'nostreamscomposed', manifest);
            hasInitialisationError = true;
            reset();
        }
    }

    function onTimeSyncCompleted() /*e*/{
        var manifest = manifestModel.getValue();
        //TODO check if we can move this to initialize??
        if (protectionController) {
            eventBus.trigger(_coreEventsEvents2['default'].PROTECTION_CREATED, { controller: protectionController, manifest: manifest });
            protectionController.setMediaElement(videoModel.getElement());
            if (protectionData) {
                protectionController.setProtectionData(protectionData);
            }
        }

        composeStreams(manifest);
    }

    function onManifestUpdated(e) {
        if (!e.error) {
            //Since streams are not composed yet , need to manually look up useCalculatedLiveEdgeTime to detect if stream
            //is SegmentTimeline to avoid using time source
            var manifest = e.manifest;
            var streamInfo = adapter.getStreamsInfo(manifest)[0];
            var mediaInfo = adapter.getMediaInfoForType(manifest, streamInfo, 'video') || adapter.getMediaInfoForType(manifest, streamInfo, 'audio');

            var adaptation, useCalculatedLiveEdgeTime;

            if (mediaInfo) {
                adaptation = adapter.getDataForMedia(mediaInfo);
                useCalculatedLiveEdgeTime = dashManifestModel.getRepresentationsForAdaptation(manifest, adaptation)[0].useCalculatedLiveEdgeTime;

                if (useCalculatedLiveEdgeTime) {
                    log('SegmentTimeline detected using calculated Live Edge Time');
                    mediaPlayerModel.setUseManifestDateHeaderTimeSource(false);
                }
            }

            var manifestUTCTimingSources = dashManifestModel.getUTCTimingSources(e.manifest);
            var allUTCTimingSources = !dashManifestModel.getIsDynamic(manifest) || useCalculatedLiveEdgeTime ? manifestUTCTimingSources : manifestUTCTimingSources.concat(mediaPlayerModel.getUTCTimingSources());
            var isHTTPS = (0, _modelsURIQueryAndFragmentModel2['default'])(context).getInstance().isManifestHTTPS();

            //If https is detected on manifest then lets apply that protocol to only the default time source(s). In the future we may find the need to apply this to more then just default so left code at this level instead of in MediaPlayer.
            allUTCTimingSources.forEach(function (item) {
                if (item.value.replace(/.*?:\/\//g, '') === _modelsMediaPlayerModel2['default'].DEFAULT_UTC_TIMING_SOURCE.value.replace(/.*?:\/\//g, '')) {
                    item.value = item.value.replace(isHTTPS ? new RegExp(/^(http:)?\/\//i) : new RegExp(/^(https:)?\/\//i), isHTTPS ? 'https://' : 'http://');
                    log('Matching default timing source protocol to manifest protocol: ', item.value);
                }
            });

            baseURLController.initialize(manifest);

            timeSyncController.setConfig({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics
            });
            timeSyncController.initialize(allUTCTimingSources, mediaPlayerModel.getUseManifestDateHeaderTimeSource());
        } else {
            hasInitialisationError = true;
            reset();
        }
    }

    function isVideoTrackPresent() {
        if (videoTrackDetected === undefined) {
            videoTrackDetected = checkVideoPresence();
        }
        return videoTrackDetected;
    }

    function checkVideoPresence() {
        var isVideoDetected = false;
        activeStream.getProcessors().forEach(function (p) {
            if (p.getMediaInfo().type === 'video') {
                isVideoDetected = true;
            }
        });
        return isVideoDetected;
    }

    function flushPlaylistMetrics(reason, time) {
        time = time || new Date();

        if (playListMetrics) {
            if (activeStream) {
                activeStream.getProcessors().forEach(function (p) {
                    var ctrlr = p.getScheduleController();
                    if (ctrlr) {
                        ctrlr.finalisePlayList(time, reason);
                    }
                });
            }
            metricsModel.addPlayList(playListMetrics);
            playListMetrics = null;
        }
    }

    function addPlaylistMetrics(startReason) {
        playListMetrics = new _voMetricsPlayList.PlayList();
        playListMetrics.start = new Date();
        playListMetrics.mstart = playbackController.getTime() * 1000;
        playListMetrics.starttype = startReason;

        if (activeStream) {
            activeStream.getProcessors().forEach(function (p) {
                var ctrlr = p.getScheduleController();
                if (ctrlr) {
                    ctrlr.setPlayList(playListMetrics);
                }
            });
        }
    }

    function onPlaybackError(e) {

        if (!e.error) return;

        var msg = '';

        switch (e.error.code) {
            case 1:
                msg = 'MEDIA_ERR_ABORTED';
                break;
            case 2:
                msg = 'MEDIA_ERR_NETWORK';
                break;
            case 3:
                msg = 'MEDIA_ERR_DECODE';
                break;
            case 4:
                msg = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
                break;
            case 5:
                msg = 'MEDIA_ERR_ENCRYPTED';
                break;
            default:
                msg = 'UNKNOWN';
                break;
        }

        hasMediaError = true;

        if (e.error.msExtendedCode) {
            msg += ' (0x' + (e.error.msExtendedCode >>> 0).toString(16).toUpperCase() + ')';
        }

        log('Video Element Error: ' + msg);
        if (e.error) {
            log(e.error);
        }
        errHandler.mediaSourceError(msg);
        reset();
    }

    function getAutoPlay() {
        return autoPlay;
    }

    function getActiveStreamInfo() {
        return activeStream ? activeStream.getStreamInfo() : null;
    }

    function isStreamActive(streamInfo) {
        return activeStream.getId() === streamInfo.id;
    }

    function getStreamById(id) {
        return streams.filter(function (item) {
            return item.getId() === id;
        })[0];
    }

    function load(url) {
        manifestLoader.load(url);
    }

    function loadWithManifest(manifest) {
        manifestUpdater.setManifest(manifest);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.capabilities) {
            capabilities = config.capabilities;
        }
        if (config.manifestLoader) {
            manifestLoader = config.manifestLoader;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
        if (config.protectionController) {
            protectionController = config.protectionController;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.metricsModel) {
            metricsModel = config.metricsModel;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.liveEdgeFinder) {
            liveEdgeFinder = config.liveEdgeFinder;
        }
        if (config.mediaSourceController) {
            mediaSourceController = config.mediaSourceController;
        }
        if (config.timeSyncController) {
            timeSyncController = config.timeSyncController;
        }
        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
    }

    function reset() {
        timeSyncController.reset();

        flushPlaylistMetrics(hasMediaError || hasInitialisationError ? _voMetricsPlayList.PlayListTrace.FAILURE_STOP_REASON : _voMetricsPlayList.PlayListTrace.USER_REQUEST_STOP_REASON);

        for (var i = 0, ln = streams.length; i < ln; i++) {
            var stream = streams[i];
            stream.reset(hasMediaError);
        }

        streams = [];

        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_ENDED, onEnded, this);
        eventBus.off(_coreEventsEvents2['default'].MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.off(_coreEventsEvents2['default'].STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);

        baseURLController.reset();
        manifestUpdater.reset();
        metricsModel.clearAllCurrentMetrics();
        manifestModel.setValue(null);
        manifestLoader.reset();
        timelineConverter.reset();
        liveEdgeFinder.reset();
        adapter.reset();
        initCache.reset();
        isStreamSwitchingInProgress = false;
        isUpdating = false;
        activeStream = null;
        hasMediaError = false;
        hasInitialisationError = false;
        videoTrackDetected = undefined;
        initialPlayback = true;
        isPaused = false;

        if (mediaSource) {
            mediaSourceController.detachMediaSource(videoModel);
            mediaSource = null;
        }
        videoModel = null;
        if (protectionController) {
            protectionController.setMediaElement(null);
            protectionController = null;
            protectionData = null;
            if (manifestModel.getValue()) {
                eventBus.trigger(_coreEventsEvents2['default'].PROTECTION_DESTROYED, { data: manifestModel.getValue().url });
            }
        }

        eventBus.trigger(_coreEventsEvents2['default'].STREAM_TEARDOWN_COMPLETE);
    }

    instance = {
        initialize: initialize,
        getAutoPlay: getAutoPlay,
        getActiveStreamInfo: getActiveStreamInfo,
        isStreamActive: isStreamActive,
        isVideoTrackPresent: isVideoTrackPresent,
        getStreamById: getStreamById,
        getTimeRelativeToStreamId: getTimeRelativeToStreamId,
        load: load,
        loadWithManifest: loadWithManifest,
        getActiveStreamCommonEarliestTime: getActiveStreamCommonEarliestTime,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';

exports['default'] = _coreFactoryMaker2['default'].getSingletonFactory(StreamController);
module.exports = exports['default'];
//# sourceMappingURL=StreamController.js.map
