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

var _rulesSwitchRequest = require('../rules/SwitchRequest');

var _rulesSwitchRequest2 = _interopRequireDefault(_rulesSwitchRequest);

var _voBitrateInfo = require('../vo/BitrateInfo');

var _voBitrateInfo2 = _interopRequireDefault(_voBitrateInfo);

var _utilsDOMStorage = require('../utils/DOMStorage');

var _utilsDOMStorage2 = _interopRequireDefault(_utilsDOMStorage);

var _rulesAbrABRRulesCollection = require('../rules/abr/ABRRulesCollection');

var _rulesAbrABRRulesCollection2 = _interopRequireDefault(_rulesAbrABRRulesCollection);

var _modelsMediaPlayerModel = require('../models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _modelsFragmentModel = require('../models/FragmentModel');

var _modelsFragmentModel2 = _interopRequireDefault(_modelsFragmentModel);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _modelsManifestModel = require('../models/ManifestModel');

var _modelsManifestModel2 = _interopRequireDefault(_modelsManifestModel);

var _dashModelsDashManifestModel = require('../../dash/models/DashManifestModel');

var _dashModelsDashManifestModel2 = _interopRequireDefault(_dashModelsDashManifestModel);

var _modelsVideoModel = require('../models/VideoModel');

var _modelsVideoModel2 = _interopRequireDefault(_modelsVideoModel);

var ABANDON_LOAD = 'abandonload';
var ALLOW_LOAD = 'allowload';
var DEFAULT_VIDEO_BITRATE = 1000;
var DEFAULT_AUDIO_BITRATE = 100;
var QUALITY_DEFAULT = 0;

function AbrController() {

    var context = this.context;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        abrRulesCollection = undefined,
        rulesController = undefined,
        streamController = undefined,
        autoSwitchBitrate = undefined,
        topQualities = undefined,
        qualityDict = undefined,
        confidenceDict = undefined,
        bitrateDict = undefined,
        ratioDict = undefined,
        averageThroughputDict = undefined,
        streamProcessorDict = undefined,
        abandonmentStateDict = undefined,
        abandonmentTimeout = undefined,
        limitBitrateByPortal = undefined,
        usePixelRatioInLimitBitrateByPortal = undefined,
        windowResizeEventCalled = undefined,
        elementWidth = undefined,
        elementHeight = undefined,
        manifestModel = undefined,
        dashManifestModel = undefined,
        videoModel = undefined,
        mediaPlayerModel = undefined,
        domStorage = undefined;

    function setup() {
        autoSwitchBitrate = { video: true, audio: true };
        topQualities = {};
        qualityDict = {};
        confidenceDict = {};
        bitrateDict = {};
        ratioDict = {};
        averageThroughputDict = {};
        abandonmentStateDict = {};
        streamProcessorDict = {};
        limitBitrateByPortal = false;
        usePixelRatioInLimitBitrateByPortal = false;
        if (windowResizeEventCalled === undefined) {
            windowResizeEventCalled = false;
        }
        domStorage = (0, _utilsDOMStorage2['default'])(context).getInstance();
        mediaPlayerModel = (0, _modelsMediaPlayerModel2['default'])(context).getInstance();
        manifestModel = (0, _modelsManifestModel2['default'])(context).getInstance();
        dashManifestModel = (0, _dashModelsDashManifestModel2['default'])(context).getInstance();
        videoModel = (0, _modelsVideoModel2['default'])(context).getInstance();
    }

    function initialize(type, streamProcessor) {
        streamProcessorDict[type] = streamProcessor;
        abandonmentStateDict[type] = abandonmentStateDict[type] || {};
        abandonmentStateDict[type].state = ALLOW_LOAD;
        eventBus.on(_coreEventsEvents2['default'].LOADING_PROGRESS, onFragmentLoadProgress, this);
        if (type == 'video') {
            setElementSize();
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.abrRulesCollection) {
            abrRulesCollection = config.abrRulesCollection;
        }
        if (config.rulesController) {
            rulesController = config.rulesController;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
    }

    function getTopQualityIndexFor(type, id) {
        var idx;
        topQualities[id] = topQualities[id] || {};

        if (!topQualities[id].hasOwnProperty(type)) {
            topQualities[id][type] = 0;
        }

        idx = checkMaxBitrate(topQualities[id][type], type);
        idx = checkMaxRepresentationRatio(idx, type, topQualities[id][type]);
        idx = checkPortalSize(idx, type);
        return idx;
    }

    /**
     * @param {string} type
     * @returns {number} A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function getInitialBitrateFor(type) {

        var savedBitrate = domStorage.getSavedBitrateSettings(type);

        if (!bitrateDict.hasOwnProperty(type)) {
            if (ratioDict.hasOwnProperty(type)) {
                var manifest = manifestModel.getValue();
                var representation = dashManifestModel.getAdaptationForType(manifest, 0, type).Representation;

                if (Array.isArray(representation)) {
                    var repIdx = Math.max(Math.round(representation.length * ratioDict[type]) - 1, 0);
                    bitrateDict[type] = representation[repIdx].bandwidth;
                } else {
                    bitrateDict[type] = 0;
                }
            } else if (!isNaN(savedBitrate)) {
                bitrateDict[type] = savedBitrate;
            } else {
                bitrateDict[type] = type === 'video' ? DEFAULT_VIDEO_BITRATE : DEFAULT_AUDIO_BITRATE;
            }
        }

        return bitrateDict[type];
    }

    /**
     * @param {string} type
     * @param {number} value A value of the initial bitrate, kbps
     * @memberof AbrController#
     */
    function setInitialBitrateFor(type, value) {
        bitrateDict[type] = value;
    }

    function getInitialRepresentationRatioFor(type) {
        if (!ratioDict.hasOwnProperty(type)) {
            return null;
        }

        return ratioDict[type];
    }

    function setInitialRepresentationRatioFor(type, value) {
        ratioDict[type] = value;
    }

    function getMaxAllowedBitrateFor(type) {
        if (bitrateDict.hasOwnProperty('max') && bitrateDict.max.hasOwnProperty(type)) {
            return bitrateDict.max[type];
        }
        return NaN;
    }

    //TODO  change bitrateDict structure to hold one object for video and audio with initial and max values internal.
    // This means you need to update all the logic around initial bitrate DOMStorage, RebController etc...
    function setMaxAllowedBitrateFor(type, value) {
        bitrateDict.max = bitrateDict.max || {};
        bitrateDict.max[type] = value;
    }

    function getMaxAllowedRepresentationRatioFor(type) {
        if (ratioDict.hasOwnProperty('max') && ratioDict.max.hasOwnProperty(type)) {
            return ratioDict.max[type];
        }
        return 1;
    }

    function setMaxAllowedRepresentationRatioFor(type, value) {
        ratioDict.max = ratioDict.max || {};
        ratioDict.max[type] = value;
    }

    function getAutoSwitchBitrateFor(type) {
        return autoSwitchBitrate[type];
    }

    function setAutoSwitchBitrateFor(type, value) {
        autoSwitchBitrate[type] = value;
    }

    function getLimitBitrateByPortal() {
        return limitBitrateByPortal;
    }

    function setLimitBitrateByPortal(value) {
        limitBitrateByPortal = value;
    }

    function getUsePixelRatioInLimitBitrateByPortal() {
        return usePixelRatioInLimitBitrateByPortal;
    }

    function setUsePixelRatioInLimitBitrateByPortal(value) {
        usePixelRatioInLimitBitrateByPortal = value;
    }

    function getPlaybackQuality(streamProcessor, completedCallback) {

        var type = streamProcessor.getType();
        var streamInfo = streamProcessor.getStreamInfo();
        var streamId = streamInfo.id;

        var callback = function callback(res) {

            var topQualityIdx = getTopQualityIndexFor(type, streamId);

            var newQuality = res.value;
            if (newQuality < 0) {
                newQuality = 0;
            }
            if (newQuality > topQualityIdx) {
                newQuality = topQualityIdx;
            }

            var oldQuality = getQualityFor(type, streamInfo);
            if (newQuality !== oldQuality && (abandonmentStateDict[type].state === ALLOW_LOAD || newQuality > oldQuality)) {
                setConfidenceFor(type, streamId, res.confidence);
                changeQuality(type, streamInfo, oldQuality, newQuality, res.reason);
            }
            if (completedCallback) {
                completedCallback();
            }
        };

        //log("ABR enabled? (" + autoSwitchBitrate + ")");
        if (!getAutoSwitchBitrateFor(type)) {
            if (completedCallback) {
                completedCallback();
            }
        } else {
            var rules = abrRulesCollection.getRules(_rulesAbrABRRulesCollection2['default'].QUALITY_SWITCH_RULES);
            rulesController.applyRules(rules, streamProcessor, callback, getQualityFor(type, streamInfo), function (currentValue, newValue) {
                currentValue = currentValue === _rulesSwitchRequest2['default'].NO_CHANGE ? 0 : currentValue;
                return Math.max(currentValue, newValue);
            });
        }
    }

    function setPlaybackQuality(type, streamInfo, newQuality, reason) {
        var id = streamInfo.id;
        var oldQuality = getQualityFor(type, streamInfo);
        var isInt = newQuality !== null && !isNaN(newQuality) && newQuality % 1 === 0;

        if (!isInt) throw new Error('argument is not an integer');

        if (newQuality !== oldQuality && newQuality >= 0 && newQuality <= getTopQualityIndexFor(type, id)) {
            changeQuality(type, streamInfo, oldQuality, newQuality, reason);
        }
    }

    function changeQuality(type, streamInfo, oldQuality, newQuality, reason) {
        setQualityFor(type, streamInfo.id, newQuality);
        eventBus.trigger(_coreEventsEvents2['default'].QUALITY_CHANGE_REQUESTED, { mediaType: type, streamInfo: streamInfo, oldQuality: oldQuality, newQuality: newQuality, reason: reason });
    }

    function setAbandonmentStateFor(type, state) {
        abandonmentStateDict[type].state = state;
    }

    function getAbandonmentStateFor(type) {
        return abandonmentStateDict[type].state;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @param {number} bitrate A bitrate value, kbps
     * @returns {number} A quality index <= for the given bitrate
     * @memberof AbrController#
     */
    function getQualityForBitrate(mediaInfo, bitrate) {

        var bitrateList = getBitrateList(mediaInfo);

        if (!bitrateList || bitrateList.length === 0) {
            return QUALITY_DEFAULT;
        }

        for (var i = bitrateList.length - 1; i >= 0; i--) {
            var bitrateInfo = bitrateList[i];
            if (bitrate * 1000 >= bitrateInfo.bitrate) {
                return i;
            }
        }
        return 0;
    }

    /**
     * @param {MediaInfo} mediaInfo
     * @returns {Array|null} A list of {@link BitrateInfo} objects
     * @memberof AbrController#
     */
    function getBitrateList(mediaInfo) {
        if (!mediaInfo || !mediaInfo.bitrateList) return null;

        var bitrateList = mediaInfo.bitrateList;
        var type = mediaInfo.type;

        var infoList = [];
        var bitrateInfo;

        for (var i = 0, ln = bitrateList.length; i < ln; i++) {
            bitrateInfo = new _voBitrateInfo2['default']();
            bitrateInfo.mediaType = type;
            bitrateInfo.qualityIndex = i;
            bitrateInfo.bitrate = bitrateList[i].bandwidth;
            bitrateInfo.width = bitrateList[i].width;
            bitrateInfo.height = bitrateList[i].height;
            infoList.push(bitrateInfo);
        }

        return infoList;
    }

    function setAverageThroughput(type, value) {
        averageThroughputDict[type] = value;
    }

    function getAverageThroughput(type) {
        return averageThroughputDict[type];
    }

    function updateTopQualityIndex(mediaInfo) {
        var type = mediaInfo.type;
        var streamId = mediaInfo.streamInfo.id;
        var max = mediaInfo.representationCount - 1;

        setTopQualityIndex(type, streamId, max);

        return max;
    }

    function isPlayingAtTopQuality(streamInfo) {
        var isAtTop;
        var streamId = streamInfo.id;
        var audioQuality = getQualityFor('audio', streamInfo);
        var videoQuality = getQualityFor('video', streamInfo);

        isAtTop = audioQuality === getTopQualityIndexFor('audio', streamId) && videoQuality === getTopQualityIndexFor('video', streamId);

        return isAtTop;
    }

    function reset() {
        eventBus.off(_coreEventsEvents2['default'].LOADING_PROGRESS, onFragmentLoadProgress, this);
        clearTimeout(abandonmentTimeout);
        abandonmentTimeout = null;
        setup();
    }

    function getQualityFor(type, streamInfo) {
        var id = streamInfo.id;
        var quality;

        qualityDict[id] = qualityDict[id] || {};

        if (!qualityDict[id].hasOwnProperty(type)) {
            qualityDict[id][type] = QUALITY_DEFAULT;
        }

        quality = qualityDict[id][type];
        return quality;
    }

    function setQualityFor(type, id, value) {
        qualityDict[id] = qualityDict[id] || {};
        qualityDict[id][type] = value;
    }

    function getConfidenceFor(type, id) {
        var confidence;

        confidenceDict[id] = confidenceDict[id] || {};

        if (!confidenceDict[id].hasOwnProperty(type)) {
            confidenceDict[id][type] = 0;
        }

        confidence = confidenceDict[id][type];

        return confidence;
    }

    function setConfidenceFor(type, id, value) {
        confidenceDict[id] = confidenceDict[id] || {};
        confidenceDict[id][type] = value;
    }

    function setTopQualityIndex(type, id, value) {
        topQualities[id] = topQualities[id] || {};
        topQualities[id][type] = value;
    }

    function checkMaxBitrate(idx, type) {
        var maxBitrate = getMaxAllowedBitrateFor(type);
        if (isNaN(maxBitrate) || !streamProcessorDict[type]) {
            return idx;
        }
        var maxIdx = getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), maxBitrate);
        return Math.min(idx, maxIdx);
    }

    function checkMaxRepresentationRatio(idx, type, maxIdx) {
        var maxRepresentationRatio = getMaxAllowedRepresentationRatioFor(type);
        if (isNaN(maxRepresentationRatio) || maxRepresentationRatio >= 1 || maxRepresentationRatio < 0) {
            return idx;
        }
        return Math.min(idx, Math.round(maxIdx * maxRepresentationRatio));
    }

    function setWindowResizeEventCalled(value) {
        windowResizeEventCalled = value;
    }

    function setElementSize() {
        var element = videoModel.getElement();
        if (element !== undefined) {
            var hasPixelRatio = usePixelRatioInLimitBitrateByPortal && window.hasOwnProperty('devicePixelRatio');
            var pixelRatio = hasPixelRatio ? window.devicePixelRatio : 1;
            elementWidth = element.clientWidth * pixelRatio;
            elementHeight = element.clientHeight * pixelRatio;
        }
    }

    function checkPortalSize(idx, type) {
        if (type !== 'video' || !limitBitrateByPortal || !streamProcessorDict[type]) {
            return idx;
        }

        if (!windowResizeEventCalled) {
            setElementSize();
        }

        var manifest = manifestModel.getValue();
        var representation = dashManifestModel.getAdaptationForType(manifest, 0, type).Representation;
        var newIdx = idx;

        if (elementWidth > 0 && elementHeight > 0) {
            while (newIdx > 0 && representation[newIdx] && elementWidth < representation[newIdx].width && elementWidth - representation[newIdx - 1].width < representation[newIdx].width - elementWidth) {
                newIdx = newIdx - 1;
            }

            if (representation.length - 2 >= newIdx && representation[newIdx].width === representation[newIdx + 1].width) {
                newIdx = Math.min(idx, newIdx + 1);
            }
        }

        return newIdx;
    }

    function onFragmentLoadProgress(e) {
        var type = e.request.mediaType;
        if (getAutoSwitchBitrateFor(type)) {
            var _ret = (function () {

                var rules = abrRulesCollection.getRules(_rulesAbrABRRulesCollection2['default'].ABANDON_FRAGMENT_RULES);
                var scheduleController = streamProcessorDict[type].getScheduleController();
                if (!scheduleController) return {
                        v: undefined
                    }; // There may be a fragment load in progress when we switch periods and recreated some controllers.

                var callback = function callback(switchRequest) {
                    if (switchRequest.confidence === _rulesSwitchRequest2['default'].STRONG && switchRequest.value < getQualityFor(type, streamController.getActiveStreamInfo())) {

                        var fragmentModel = scheduleController.getFragmentModel();
                        var request = fragmentModel.getRequests({ state: _modelsFragmentModel2['default'].FRAGMENT_MODEL_LOADING, index: e.request.index })[0];
                        if (request) {
                            //TODO Check if we should abort or if better to finish download. check bytesLoaded/Total
                            fragmentModel.abortRequests();
                            setAbandonmentStateFor(type, ABANDON_LOAD);
                            setPlaybackQuality(type, streamController.getActiveStreamInfo(), switchRequest.value, switchRequest.reason);
                            eventBus.trigger(_coreEventsEvents2['default'].FRAGMENT_LOADING_ABANDONED, { streamProcessor: streamProcessorDict[type], request: request, mediaType: type });

                            clearTimeout(abandonmentTimeout);
                            abandonmentTimeout = setTimeout(function () {
                                setAbandonmentStateFor(type, ALLOW_LOAD);
                                abandonmentTimeout = null;
                            }, mediaPlayerModel.getAbandonLoadTimeout());
                        }
                    }
                };

                rulesController.applyRules(rules, streamProcessorDict[type], callback, e, function (currentValue, newValue) {
                    return newValue;
                });
            })();

            if (typeof _ret === 'object') return _ret.v;
        }
    }

    instance = {
        isPlayingAtTopQuality: isPlayingAtTopQuality,
        updateTopQualityIndex: updateTopQualityIndex,
        getAverageThroughput: getAverageThroughput,
        getBitrateList: getBitrateList,
        getQualityForBitrate: getQualityForBitrate,
        getMaxAllowedBitrateFor: getMaxAllowedBitrateFor,
        setMaxAllowedBitrateFor: setMaxAllowedBitrateFor,
        getMaxAllowedRepresentationRatioFor: getMaxAllowedRepresentationRatioFor,
        setMaxAllowedRepresentationRatioFor: setMaxAllowedRepresentationRatioFor,
        getInitialBitrateFor: getInitialBitrateFor,
        setInitialBitrateFor: setInitialBitrateFor,
        getInitialRepresentationRatioFor: getInitialRepresentationRatioFor,
        setInitialRepresentationRatioFor: setInitialRepresentationRatioFor,
        setAutoSwitchBitrateFor: setAutoSwitchBitrateFor,
        getAutoSwitchBitrateFor: getAutoSwitchBitrateFor,
        setLimitBitrateByPortal: setLimitBitrateByPortal,
        getLimitBitrateByPortal: getLimitBitrateByPortal,
        getUsePixelRatioInLimitBitrateByPortal: getUsePixelRatioInLimitBitrateByPortal,
        setUsePixelRatioInLimitBitrateByPortal: setUsePixelRatioInLimitBitrateByPortal,
        getConfidenceFor: getConfidenceFor,
        getQualityFor: getQualityFor,
        getAbandonmentStateFor: getAbandonmentStateFor,
        setAbandonmentStateFor: setAbandonmentStateFor,
        setPlaybackQuality: setPlaybackQuality,
        getPlaybackQuality: getPlaybackQuality,
        setAverageThroughput: setAverageThroughput,
        getTopQualityIndexFor: getTopQualityIndexFor,
        setElementSize: setElementSize,
        setWindowResizeEventCalled: setWindowResizeEventCalled,
        initialize: initialize,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

AbrController.__dashjs_factory_name = 'AbrController';
var factory = _coreFactoryMaker2['default'].getSingletonFactory(AbrController);
factory.ABANDON_LOAD = ABANDON_LOAD;
factory.QUALITY_DEFAULT = QUALITY_DEFAULT;
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=AbrController.js.map
