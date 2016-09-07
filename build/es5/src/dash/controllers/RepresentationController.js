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

var _modelsDashManifestModel = require('../models/DashManifestModel');

var _modelsDashManifestModel2 = _interopRequireDefault(_modelsDashManifestModel);

var _DashMetrics = require('../DashMetrics');

var _DashMetrics2 = _interopRequireDefault(_DashMetrics);

var _utilsTimelineConverter = require('../utils/TimelineConverter');

var _utilsTimelineConverter2 = _interopRequireDefault(_utilsTimelineConverter);

var _streamingControllersAbrController = require('../../streaming/controllers/AbrController');

var _streamingControllersAbrController2 = _interopRequireDefault(_streamingControllersAbrController);

var _streamingControllersPlaybackController = require('../../streaming/controllers/PlaybackController');

var _streamingControllersPlaybackController2 = _interopRequireDefault(_streamingControllersPlaybackController);

var _streamingControllersStreamController = require('../../streaming/controllers/StreamController');

var _streamingControllersStreamController2 = _interopRequireDefault(_streamingControllersStreamController);

var _streamingModelsManifestModel = require('../../streaming/models/ManifestModel');

var _streamingModelsManifestModel2 = _interopRequireDefault(_streamingModelsManifestModel);

var _streamingModelsMetricsModel = require('../../streaming/models/MetricsModel');

var _streamingModelsMetricsModel2 = _interopRequireDefault(_streamingModelsMetricsModel);

var _streamingModelsMediaPlayerModel = require('../../streaming/models/MediaPlayerModel');

var _streamingModelsMediaPlayerModel2 = _interopRequireDefault(_streamingModelsMediaPlayerModel);

var _streamingUtilsDOMStorage = require('../../streaming/utils/DOMStorage');

var _streamingUtilsDOMStorage2 = _interopRequireDefault(_streamingUtilsDOMStorage);

var _streamingVoError = require('../../streaming/vo/Error');

var _streamingVoError2 = _interopRequireDefault(_streamingVoError);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

function RepresentationController() {

    var SEGMENTS_UPDATE_FAILED_ERROR_CODE = 1;

    var context = this.context;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        data = undefined,
        dataIndex = undefined,
        updating = undefined,
        availableRepresentations = undefined,
        currentRepresentation = undefined,
        streamProcessor = undefined,
        abrController = undefined,
        indexHandler = undefined,
        streamController = undefined,
        playbackController = undefined,
        manifestModel = undefined,
        metricsModel = undefined,
        domStorage = undefined,
        timelineConverter = undefined,
        dashManifestModel = undefined,
        dashMetrics = undefined,
        mediaPlayerModel = undefined;

    function setup() {
        data = null;
        dataIndex = -1;
        updating = true;
        availableRepresentations = [];

        abrController = (0, _streamingControllersAbrController2['default'])(context).getInstance();
        streamController = (0, _streamingControllersStreamController2['default'])(context).getInstance();
        playbackController = (0, _streamingControllersPlaybackController2['default'])(context).getInstance();
        manifestModel = (0, _streamingModelsManifestModel2['default'])(context).getInstance();
        metricsModel = (0, _streamingModelsMetricsModel2['default'])(context).getInstance();
        domStorage = (0, _streamingUtilsDOMStorage2['default'])(context).getInstance();
        timelineConverter = (0, _utilsTimelineConverter2['default'])(context).getInstance();
        dashManifestModel = (0, _modelsDashManifestModel2['default'])(context).getInstance();
        dashMetrics = (0, _DashMetrics2['default'])(context).getInstance();
        mediaPlayerModel = (0, _streamingModelsMediaPlayerModel2['default'])(context).getInstance();

        eventBus.on(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.on(_coreEventsEvents2['default'].REPRESENTATION_UPDATED, onRepresentationUpdated, instance);
        eventBus.on(_coreEventsEvents2['default'].WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, instance);
        eventBus.on(_coreEventsEvents2['default'].BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);
        eventBus.on(_coreEventsEvents2['default'].LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, instance);
    }

    function setConfig(config) {
        // allow the abrController created in setup to be overidden
        if (config.abrController) {
            abrController = config.abrController;
        }
    }

    function initialize(StreamProcessor) {
        streamProcessor = StreamProcessor;
        indexHandler = streamProcessor.getIndexHandler();
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function getData() {
        return data;
    }

    function getDataIndex() {
        return dataIndex;
    }

    function isUpdating() {
        return updating;
    }

    function getCurrentRepresentation() {
        return currentRepresentation;
    }

    function reset() {

        eventBus.off(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.off(_coreEventsEvents2['default'].REPRESENTATION_UPDATED, onRepresentationUpdated, instance);
        eventBus.off(_coreEventsEvents2['default'].WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, instance);
        eventBus.off(_coreEventsEvents2['default'].BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);
        eventBus.off(_coreEventsEvents2['default'].LIVE_EDGE_SEARCH_COMPLETED, onLiveEdgeSearchCompleted, instance);

        data = null;
        dataIndex = -1;
        updating = true;
        availableRepresentations = [];
        abrController = null;
        streamController = null;
        playbackController = null;
        manifestModel = null;
        metricsModel = null;
        domStorage = null;
        timelineConverter = null;
        dashManifestModel = null;
        dashMetrics = null;
        mediaPlayerModel = null;
    }

    function updateData(dataValue, adaptation, type) {
        var quality, averageThroughput;

        var bitrate = null;
        var streamInfo = streamProcessor.getStreamInfo();
        var maxQuality = abrController.getTopQualityIndexFor(type, streamInfo.id);

        updating = true;
        eventBus.trigger(_coreEventsEvents2['default'].DATA_UPDATE_STARTED, { sender: this });

        availableRepresentations = updateRepresentations(adaptation);

        if (data === null && type !== 'fragmentedText') {
            averageThroughput = abrController.getAverageThroughput(type);
            bitrate = averageThroughput || abrController.getInitialBitrateFor(type, streamInfo);
            quality = abrController.getQualityForBitrate(streamProcessor.getMediaInfo(), bitrate);
        } else {
            quality = abrController.getQualityFor(type, streamInfo);
        }

        if (quality > maxQuality) {
            quality = maxQuality;
        }

        currentRepresentation = getRepresentationForQuality(quality);
        data = dataValue;

        if (type !== 'video' && type !== 'audio' && type !== 'fragmentedText') {
            updating = false;
            eventBus.trigger(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, { sender: this, data: data, currentRepresentation: currentRepresentation });
            return;
        }

        for (var i = 0; i < availableRepresentations.length; i++) {
            indexHandler.updateRepresentation(availableRepresentations[i], true);
        }
    }

    function addRepresentationSwitch() {
        var now = new Date();
        var currentRepresentation = getCurrentRepresentation();
        var currentVideoTimeMs = playbackController.getTime() * 1000;

        metricsModel.addRepresentationSwitch(currentRepresentation.adaptation.type, now, currentVideoTimeMs, currentRepresentation.id);
    }

    function addDVRMetric() {
        var range = timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, streamProcessor.isDynamic());
        metricsModel.addDVRInfo(streamProcessor.getType(), playbackController.getTime(), streamProcessor.getStreamInfo().manifestInfo, range);
    }

    function getRepresentationForQuality(quality) {
        return availableRepresentations[quality];
    }

    function getQualityForRepresentation(representation) {
        return availableRepresentations.indexOf(representation);
    }

    function isAllRepresentationsUpdated() {
        for (var i = 0, ln = availableRepresentations.length; i < ln; i++) {
            var segmentInfoType = availableRepresentations[i].segmentInfoType;
            if (availableRepresentations[i].segmentAvailabilityRange === null || availableRepresentations[i].initialization === null || (segmentInfoType === 'SegmentBase' || segmentInfoType === 'BaseURL') && !availableRepresentations[i].segments) {
                return false;
            }
        }

        return true;
    }

    function updateRepresentations(adaptation) {
        var reps;
        var manifest = manifestModel.getValue();

        dataIndex = dashManifestModel.getIndexForAdaptation(data, manifest, adaptation.period.index);
        reps = dashManifestModel.getRepresentationsForAdaptation(manifest, adaptation);

        return reps;
    }

    function updateAvailabilityWindow(isDynamic) {
        var rep;

        for (var i = 0, ln = availableRepresentations.length; i < ln; i++) {
            rep = availableRepresentations[i];
            rep.segmentAvailabilityRange = timelineConverter.calcSegmentAvailabilityRange(rep, isDynamic);
        }
    }

    function resetAvailabilityWindow() {
        availableRepresentations.forEach(function (rep) {
            rep.segmentAvailabilityRange = null;
        });
    }

    function postponeUpdate(postponeTimePeriod) {
        var delay = postponeTimePeriod;
        var update = function update() {
            if (isUpdating()) return;

            updating = true;
            eventBus.trigger(_coreEventsEvents2['default'].DATA_UPDATE_STARTED, { sender: instance });

            // clear the segmentAvailabilityRange for all reps.
            // this ensures all are updated before the live edge search starts
            resetAvailabilityWindow();

            for (var i = 0; i < availableRepresentations.length; i++) {
                indexHandler.updateRepresentation(availableRepresentations[i], true);
            }
        };

        updating = false;
        eventBus.trigger(_coreEventsEvents2['default'].AST_IN_FUTURE, { delay: delay });
        setTimeout(update, delay);
    }

    function onRepresentationUpdated(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor || !isUpdating()) return;

        var r = e.representation;
        var streamMetrics = metricsModel.getMetricsFor('stream');
        var metrics = metricsModel.getMetricsFor(getCurrentRepresentation().adaptation.type);
        var manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(streamMetrics);
        var alreadyAdded = false;
        var postponeTimePeriod = 0;
        var repInfo;
        var err;
        var repSwitch;

        if (r.adaptation.period.mpd.manifest.type === 'dynamic') {
            var segmentAvailabilityTimePeriod = r.segmentAvailabilityRange.end - r.segmentAvailabilityRange.start;
            // We must put things to sleep unless till e.g. the startTime calculation in ScheduleController.onLiveEdgeSearchCompleted fall after the segmentAvailabilityRange.start
            var liveDelay = playbackController.computeLiveDelay(currentRepresentation.segmentDuration, streamProcessor.getStreamInfo().manifestInfo.DVRWindowSize);
            postponeTimePeriod = (liveDelay - segmentAvailabilityTimePeriod) * 1000;
        }

        if (postponeTimePeriod > 0) {
            addDVRMetric();
            postponeUpdate(postponeTimePeriod);
            err = new _streamingVoError2['default'](SEGMENTS_UPDATE_FAILED_ERROR_CODE, 'Segments update failed', null);
            eventBus.trigger(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, { sender: this, data: data, currentRepresentation: currentRepresentation, error: err });

            return;
        }

        if (manifestUpdateInfo) {
            for (var i = 0; i < manifestUpdateInfo.trackInfo.length; i++) {
                repInfo = manifestUpdateInfo.trackInfo[i];
                if (repInfo.index === r.index && repInfo.mediaType === streamProcessor.getType()) {
                    alreadyAdded = true;
                    break;
                }
            }

            if (!alreadyAdded) {
                metricsModel.addManifestUpdateRepresentationInfo(manifestUpdateInfo, r.id, r.index, r.adaptation.period.index, streamProcessor.getType(), r.presentationTimeOffset, r.startNumber, r.segmentInfoType);
            }
        }

        if (isAllRepresentationsUpdated()) {
            updating = false;
            abrController.setPlaybackQuality(streamProcessor.getType(), streamProcessor.getStreamInfo(), getQualityForRepresentation(currentRepresentation));
            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, { latency: currentRepresentation.segmentAvailabilityRange.end - playbackController.getTime() });

            repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);

            if (!repSwitch) {
                addRepresentationSwitch();
            }

            eventBus.trigger(_coreEventsEvents2['default'].DATA_UPDATE_COMPLETED, { sender: this, data: data, currentRepresentation: currentRepresentation });
        }
    }

    function onWallclockTimeUpdated(e) {
        if (e.isDynamic) {
            updateAvailabilityWindow(e.isDynamic);
        }
    }

    function onLiveEdgeSearchCompleted(e) {
        if (e.error) return;

        updateAvailabilityWindow(true);
        indexHandler.updateRepresentation(currentRepresentation, false);

        // we need to update checkTime after we have found the live edge because its initial value
        // does not take into account clientServerTimeShift
        var manifest = manifestModel.getValue();
        var period = currentRepresentation.adaptation.period;
        var streamInfo = streamController.getActiveStreamInfo();

        if (streamInfo.isLast) {
            period.mpd.checkTime = dashManifestModel.getCheckTime(manifest, period);
            period.duration = dashManifestModel.getEndTimeForLastPeriod(manifestModel.getValue(), period) - period.start;
            streamInfo.duration = period.duration;
        }
    }

    function onBufferLevelUpdated(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        addDVRMetric();
    }

    function onQualityChanged(e) {
        if (e.mediaType !== streamProcessor.getType() || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        if (e.oldQuality !== e.newQuality) {
            currentRepresentation = getRepresentationForQuality(e.newQuality);
            domStorage.setSavedBitrateSettings(e.mediaType, currentRepresentation.bandwidth);
            addRepresentationSwitch();
        }
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        getData: getData,
        getDataIndex: getDataIndex,
        isUpdating: isUpdating,
        updateData: updateData,
        getStreamProcessor: getStreamProcessor,
        getCurrentRepresentation: getCurrentRepresentation,
        getRepresentationForQuality: getRepresentationForQuality,
        reset: reset
    };

    setup();
    return instance;
}

RepresentationController.__dashjs_factory_name = 'RepresentationController';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(RepresentationController);
module.exports = exports['default'];
//# sourceMappingURL=RepresentationController.js.map
