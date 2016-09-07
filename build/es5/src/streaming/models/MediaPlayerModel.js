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

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _voMetricsHTTPRequest = require('../vo/metrics/HTTPRequest');

var DEFAULT_UTC_TIMING_SOURCE = { scheme: 'urn:mpeg:dash:utc:http-xsdate:2014', value: 'http://time.akamai.com/?iso' };
var LIVE_DELAY_FRAGMENT_COUNT = 4;

var DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION = 360000;
var DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION = 360000;

var BANDWIDTH_SAFETY_FACTOR = 0.9;
var ABANDON_LOAD_TIMEOUT = 10000;

var BUFFER_TO_KEEP = 30;
var BUFFER_PRUNING_INTERVAL = 30;
var DEFAULT_MIN_BUFFER_TIME = 12;
var DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH = 20;
var BUFFER_TIME_AT_TOP_QUALITY = 30;
var BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 60;
var LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;
var RICH_BUFFER_THRESHOLD = 20;

var FRAGMENT_RETRY_ATTEMPTS = 3;
var FRAGMENT_RETRY_INTERVAL = 1000;

var MANIFEST_RETRY_ATTEMPTS = 3;
var MANIFEST_RETRY_INTERVAL = 500;

var XLINK_RETRY_ATTEMPTS = 1;
var XLINK_RETRY_INTERVAL = 500;

//This value influences the startup time for live (in ms).
var WALLCLOCK_TIME_UPDATE_INTERVAL = 50;

var DEFAULT_XHR_WITH_CREDENTIALS = false;

function MediaPlayerModel() {

    var instance = undefined,
        useManifestDateHeaderTimeSource = undefined,
        useSuggestedPresentationDelay = undefined,
        UTCTimingSources = undefined,
        liveDelayFragmentCount = undefined,
        liveDelay = undefined,
        scheduleWhilePaused = undefined,
        bufferToKeep = undefined,
        bufferPruningInterval = undefined,
        lastBitrateCachingInfo = undefined,
        lastMediaSettingsCachingInfo = undefined,
        stableBufferTime = undefined,
        bufferTimeAtTopQuality = undefined,
        bufferTimeAtTopQualityLongForm = undefined,
        longFormContentDurationThreshold = undefined,
        richBufferThreshold = undefined,
        bandwidthSafetyFactor = undefined,
        abandonLoadTimeout = undefined,
        retryAttempts = undefined,
        retryIntervals = undefined,
        wallclockTimeUpdateInterval = undefined,
        bufferOccupancyABREnabled = undefined,
        xhrWithCredentials = undefined,
        fastSwitchEnabled = undefined;

    function setup() {
        var _retryAttempts, _retryIntervals;

        UTCTimingSources = [];
        useSuggestedPresentationDelay = false;
        useManifestDateHeaderTimeSource = true;
        scheduleWhilePaused = true;
        bufferOccupancyABREnabled = false;
        fastSwitchEnabled = false;
        lastBitrateCachingInfo = { enabled: true, ttl: DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION };
        lastMediaSettingsCachingInfo = { enabled: true, ttl: DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION };
        liveDelayFragmentCount = LIVE_DELAY_FRAGMENT_COUNT;
        liveDelay = undefined; // Explicitly state that default is undefined
        bufferToKeep = BUFFER_TO_KEEP;
        bufferPruningInterval = BUFFER_PRUNING_INTERVAL;
        stableBufferTime = NaN;
        bufferTimeAtTopQuality = BUFFER_TIME_AT_TOP_QUALITY;
        bufferTimeAtTopQualityLongForm = BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM;
        longFormContentDurationThreshold = LONG_FORM_CONTENT_DURATION_THRESHOLD;
        richBufferThreshold = RICH_BUFFER_THRESHOLD;
        bandwidthSafetyFactor = BANDWIDTH_SAFETY_FACTOR;
        abandonLoadTimeout = ABANDON_LOAD_TIMEOUT;
        wallclockTimeUpdateInterval = WALLCLOCK_TIME_UPDATE_INTERVAL;
        xhrWithCredentials = DEFAULT_XHR_WITH_CREDENTIALS;

        retryAttempts = (_retryAttempts = {}, _defineProperty(_retryAttempts, _voMetricsHTTPRequest.HTTPRequest.MPD_TYPE, MANIFEST_RETRY_ATTEMPTS), _defineProperty(_retryAttempts, _voMetricsHTTPRequest.HTTPRequest.XLINK_EXPANSION_TYPE, XLINK_RETRY_ATTEMPTS), _defineProperty(_retryAttempts, _voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE, FRAGMENT_RETRY_ATTEMPTS), _defineProperty(_retryAttempts, _voMetricsHTTPRequest.HTTPRequest.INIT_SEGMENT_TYPE, FRAGMENT_RETRY_ATTEMPTS), _defineProperty(_retryAttempts, _voMetricsHTTPRequest.HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE, FRAGMENT_RETRY_ATTEMPTS), _defineProperty(_retryAttempts, _voMetricsHTTPRequest.HTTPRequest.INDEX_SEGMENT_TYPE, FRAGMENT_RETRY_ATTEMPTS), _defineProperty(_retryAttempts, _voMetricsHTTPRequest.HTTPRequest.OTHER_TYPE, FRAGMENT_RETRY_ATTEMPTS), _retryAttempts);

        retryIntervals = (_retryIntervals = {}, _defineProperty(_retryIntervals, _voMetricsHTTPRequest.HTTPRequest.MPD_TYPE, MANIFEST_RETRY_INTERVAL), _defineProperty(_retryIntervals, _voMetricsHTTPRequest.HTTPRequest.XLINK_EXPANSION_TYPE, XLINK_RETRY_INTERVAL), _defineProperty(_retryIntervals, _voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE, FRAGMENT_RETRY_INTERVAL), _defineProperty(_retryIntervals, _voMetricsHTTPRequest.HTTPRequest.INIT_SEGMENT_TYPE, FRAGMENT_RETRY_INTERVAL), _defineProperty(_retryIntervals, _voMetricsHTTPRequest.HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE, FRAGMENT_RETRY_INTERVAL), _defineProperty(_retryIntervals, _voMetricsHTTPRequest.HTTPRequest.INDEX_SEGMENT_TYPE, FRAGMENT_RETRY_INTERVAL), _defineProperty(_retryIntervals, _voMetricsHTTPRequest.HTTPRequest.OTHER_TYPE, FRAGMENT_RETRY_INTERVAL), _retryIntervals);
    }

    //TODO Should we use Object.define to have setters/getters? makes more readable code on other side.
    function setBufferOccupancyABREnabled(value) {
        bufferOccupancyABREnabled = value;
    }

    function getBufferOccupancyABREnabled() {
        return bufferOccupancyABREnabled;
    }

    function setBandwidthSafetyFactor(value) {
        bandwidthSafetyFactor = value;
    }

    function getBandwidthSafetyFactor() {
        return bandwidthSafetyFactor;
    }

    function setAbandonLoadTimeout(value) {
        abandonLoadTimeout = value;
    }

    function getAbandonLoadTimeout() {
        return abandonLoadTimeout;
    }

    function setStableBufferTime(value) {
        stableBufferTime = value;
    }

    function getStableBufferTime() {
        return !isNaN(stableBufferTime) ? stableBufferTime : fastSwitchEnabled ? DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH : DEFAULT_MIN_BUFFER_TIME;
    }

    function setBufferTimeAtTopQuality(value) {
        bufferTimeAtTopQuality = value;
    }

    function getBufferTimeAtTopQuality() {
        return bufferTimeAtTopQuality;
    }

    function setBufferTimeAtTopQualityLongForm(value) {
        bufferTimeAtTopQualityLongForm = value;
    }

    function getBufferTimeAtTopQualityLongForm() {
        return bufferTimeAtTopQualityLongForm;
    }

    function setLongFormContentDurationThreshold(value) {
        longFormContentDurationThreshold = value;
    }

    function getLongFormContentDurationThreshold() {
        return longFormContentDurationThreshold;
    }

    function setRichBufferThreshold(value) {
        richBufferThreshold = value;
    }

    function getRichBufferThreshold() {
        return richBufferThreshold;
    }

    function setBufferToKeep(value) {
        bufferToKeep = value;
    }

    function getBufferToKeep() {
        return bufferToKeep;
    }

    function setLastBitrateCachingInfo(enable, ttl) {
        lastBitrateCachingInfo.enabled = enable;
        if (ttl !== undefined && !isNaN(ttl) && typeof ttl === 'number') {
            lastBitrateCachingInfo.ttl = ttl;
        }
    }

    function getLastBitrateCachingInfo() {
        return lastBitrateCachingInfo;
    }

    function setLastMediaSettingsCachingInfo(enable, ttl) {
        lastMediaSettingsCachingInfo.enabled = enable;
        if (ttl !== undefined && !isNaN(ttl) && typeof ttl === 'number') {
            lastMediaSettingsCachingInfo.ttl = ttl;
        }
    }

    function getLastMediaSettingsCachingInfo() {
        return lastMediaSettingsCachingInfo;
    }

    function setBufferPruningInterval(value) {
        bufferPruningInterval = value;
    }

    function getBufferPruningInterval() {
        return bufferPruningInterval;
    }

    function setFragmentRetryAttempts(value) {
        retryAttempts[_voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE] = value;
    }

    function setRetryAttemptsForType(type, value) {
        retryAttempts[type] = value;
    }

    function getFragmentRetryAttempts() {
        return retryAttempts[_voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE];
    }

    function getRetryAttemptsForType(type) {
        return retryAttempts[type];
    }

    function setFragmentRetryInterval(value) {
        retryIntervals[_voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE] = value;
    }

    function setRetryIntervalForType(type, value) {
        retryIntervals[type] = value;
    }

    function getFragmentRetryInterval() {
        return retryIntervals[_voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE];
    }

    function getRetryIntervalForType(type) {
        return retryIntervals[type];
    }

    function setWallclockTimeUpdateInterval(value) {
        wallclockTimeUpdateInterval = value;
    }

    function getWallclockTimeUpdateInterval() {
        return wallclockTimeUpdateInterval;
    }

    function setScheduleWhilePaused(value) {
        scheduleWhilePaused = value;
    }

    function getScheduleWhilePaused() {
        return scheduleWhilePaused;
    }

    function setLiveDelayFragmentCount(value) {
        liveDelayFragmentCount = value;
    }

    function setLiveDelay(value) {
        liveDelay = value;
    }

    function getLiveDelayFragmentCount() {
        return liveDelayFragmentCount;
    }

    function getLiveDelay() {
        return liveDelay;
    }

    function setUseManifestDateHeaderTimeSource(value) {
        useManifestDateHeaderTimeSource = value;
    }

    function getUseManifestDateHeaderTimeSource() {
        return useManifestDateHeaderTimeSource;
    }

    function setUseSuggestedPresentationDelay(value) {
        useSuggestedPresentationDelay = value;
    }

    function getUseSuggestedPresentationDelay() {
        return useSuggestedPresentationDelay;
    }

    function setUTCTimingSources(value) {
        UTCTimingSources = value;
    }

    function getUTCTimingSources() {
        return UTCTimingSources;
    }

    function setXHRWithCredentials(value) {
        xhrWithCredentials = !!value;
    }

    function getXHRWithCredentials() {
        return xhrWithCredentials;
    }

    function getFastSwitchEnabled() {
        return fastSwitchEnabled;
    }

    function setFastSwitchEnabled(value) {
        fastSwitchEnabled = value;
    }

    function reset() {
        //TODO need to figure out what props to persist across sessions and which to reset if any.
        //setup();
    }

    instance = {
        setBufferOccupancyABREnabled: setBufferOccupancyABREnabled,
        getBufferOccupancyABREnabled: getBufferOccupancyABREnabled,
        setBandwidthSafetyFactor: setBandwidthSafetyFactor,
        getBandwidthSafetyFactor: getBandwidthSafetyFactor,
        setAbandonLoadTimeout: setAbandonLoadTimeout,
        getAbandonLoadTimeout: getAbandonLoadTimeout,
        setLastBitrateCachingInfo: setLastBitrateCachingInfo,
        getLastBitrateCachingInfo: getLastBitrateCachingInfo,
        setLastMediaSettingsCachingInfo: setLastMediaSettingsCachingInfo,
        getLastMediaSettingsCachingInfo: getLastMediaSettingsCachingInfo,
        setStableBufferTime: setStableBufferTime,
        getStableBufferTime: getStableBufferTime,
        setBufferTimeAtTopQuality: setBufferTimeAtTopQuality,
        getBufferTimeAtTopQuality: getBufferTimeAtTopQuality,
        setBufferTimeAtTopQualityLongForm: setBufferTimeAtTopQualityLongForm,
        getBufferTimeAtTopQualityLongForm: getBufferTimeAtTopQualityLongForm,
        setLongFormContentDurationThreshold: setLongFormContentDurationThreshold,
        getLongFormContentDurationThreshold: getLongFormContentDurationThreshold,
        setRichBufferThreshold: setRichBufferThreshold,
        getRichBufferThreshold: getRichBufferThreshold,
        setBufferToKeep: setBufferToKeep,
        getBufferToKeep: getBufferToKeep,
        setBufferPruningInterval: setBufferPruningInterval,
        getBufferPruningInterval: getBufferPruningInterval,
        setFragmentRetryAttempts: setFragmentRetryAttempts,
        getFragmentRetryAttempts: getFragmentRetryAttempts,
        setRetryAttemptsForType: setRetryAttemptsForType,
        getRetryAttemptsForType: getRetryAttemptsForType,
        setFragmentRetryInterval: setFragmentRetryInterval,
        getFragmentRetryInterval: getFragmentRetryInterval,
        setRetryIntervalForType: setRetryIntervalForType,
        getRetryIntervalForType: getRetryIntervalForType,
        setWallclockTimeUpdateInterval: setWallclockTimeUpdateInterval,
        getWallclockTimeUpdateInterval: getWallclockTimeUpdateInterval,
        setScheduleWhilePaused: setScheduleWhilePaused,
        getScheduleWhilePaused: getScheduleWhilePaused,
        getUseSuggestedPresentationDelay: getUseSuggestedPresentationDelay,
        setUseSuggestedPresentationDelay: setUseSuggestedPresentationDelay,
        setLiveDelayFragmentCount: setLiveDelayFragmentCount,
        getLiveDelayFragmentCount: getLiveDelayFragmentCount,
        getLiveDelay: getLiveDelay,
        setLiveDelay: setLiveDelay,
        setUseManifestDateHeaderTimeSource: setUseManifestDateHeaderTimeSource,
        getUseManifestDateHeaderTimeSource: getUseManifestDateHeaderTimeSource,
        setUTCTimingSources: setUTCTimingSources,
        getUTCTimingSources: getUTCTimingSources,
        setXHRWithCredentials: setXHRWithCredentials,
        getXHRWithCredentials: getXHRWithCredentials,
        setFastSwitchEnabled: setFastSwitchEnabled,
        getFastSwitchEnabled: getFastSwitchEnabled,
        reset: reset
    };

    setup();

    return instance;
}

//TODO see if you can move this and not export and just getter to get default value.
MediaPlayerModel.__dashjs_factory_name = 'MediaPlayerModel';
var factory = _coreFactoryMaker2['default'].getSingletonFactory(MediaPlayerModel);
factory.DEFAULT_UTC_TIMING_SOURCE = DEFAULT_UTC_TIMING_SOURCE;
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=MediaPlayerModel.js.map
