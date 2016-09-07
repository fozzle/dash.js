/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2016, Dash Industry Forum.
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

// For a description of the BOLA adaptive bitrate (ABR) algorithm, see http://arxiv.org/abs/1601.06748

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _SwitchRequest = require('../SwitchRequest');

var _SwitchRequest2 = _interopRequireDefault(_SwitchRequest);

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _modelsMediaPlayerModel = require('../../models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _controllersPlaybackController = require('../../controllers/PlaybackController');

var _controllersPlaybackController2 = _interopRequireDefault(_controllersPlaybackController);

var _voMetricsHTTPRequest = require('../../vo/metrics/HTTPRequest');

var _dashDashAdapter = require('../../../dash/DashAdapter');

var _dashDashAdapter2 = _interopRequireDefault(_dashDashAdapter);

var _coreEventBus = require('../../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreDebug = require('../../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

// BOLA_STATE_ONE_BITRATE   : If there is only one bitrate (or initialization failed), always return NO_CHANGE.
// BOLA_STATE_STARTUP       : Set virtual buffer such that we download fragments at most recently measured throughput.
// BOLA_STATE_STEADY        : Buffer primed, we switch to steady operation.
// TODO: add BOLA_STATE_SEEK and tune Bola behavior on seeking
var BOLA_STATE_ONE_BITRATE = 0;
var BOLA_STATE_STARTUP = 1;
var BOLA_STATE_STEADY = 2;
var BOLA_DEBUG = false; // TODO: remove

var MINIMUM_BUFFER_S = 10; // BOLA should never add artificial delays if buffer is less than MINIMUM_BUFFER_S.
var BUFFER_TARGET_S = 30; // If Schedule Controller does not allow buffer level to reach BUFFER_TARGET_S, this can be a virtual buffer level.
var REBUFFER_SAFETY_FACTOR = 0.5; // Used when buffer level is dangerously low, might happen often in live streaming.

function BolaRule(config) {

    var AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 2;
    var AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 3;

    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;
    var dashMetrics = config.dashMetrics;
    var metricsModel = config.metricsModel;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        lastCallTimeDict = undefined,
        eventMediaTypes = undefined,
        mediaPlayerModel = undefined,
        playbackController = undefined,
        adapter = undefined;

    function setup() {
        lastCallTimeDict = {};
        eventMediaTypes = [];
        mediaPlayerModel = (0, _modelsMediaPlayerModel2['default'])(context).getInstance();
        playbackController = (0, _controllersPlaybackController2['default'])(context).getInstance();
        adapter = (0, _dashDashAdapter2['default'])(context).getInstance();
        eventBus.on(_coreEventsEvents2['default'].BUFFER_EMPTY, onBufferEmpty, instance);
        eventBus.on(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.on(_coreEventsEvents2['default'].PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, instance);
    }

    function utilitiesFromBitrates(bitrates) {
        return bitrates.map(function (b) {
            return Math.log(b);
        });
        // no need to worry about offset, any offset will be compensated for by gp
    }

    // NOTE: in live streaming, the real buffer level can drop below minimumBufferS, but bola should not stick to lowest bitrate by using a virtual buffer level
    function calculateParameters(minimumBufferS, bufferTargetS, bitrates, utilities) {
        var highest_utility_index = NaN;
        if (!utilities) {
            utilities = utilitiesFromBitrates(bitrates);
            highest_utility_index = utilities.length - 1;
        } else {
            highest_utility_index = 0;
            utilities.forEach(function (u, i) {
                if (u > utilities[highest_utility_index]) highest_utility_index = i;
            });
        }

        if (highest_utility_index === 0) {
            // if highest_utility_index === 0, then always use lowest bitrate
            return null;
        }

        // TODO: Investigate if following can be better if utilities are not the default Math.log utilities.
        // If using Math.log utilities, we can choose Vp and gp to always prefer bitrates[0] at minimumBufferS and bitrates[max] at bufferTargetS.
        // (Vp * (utility + gp) - buffer_level) / bitrate has the maxima described when:
        // Vp * (utilities[0] + gp - 1) = minimumBufferS and Vp * (utilities[max] + gp - 1) = bufferTargetS
        // giving:
        var gp = 1 - utilities[0] + (utilities[highest_utility_index] - utilities[0]) / (bufferTargetS / minimumBufferS - 1);
        var Vp = minimumBufferS / (utilities[0] + gp - 1);

        return { utilities: utilities, gp: gp, Vp: Vp };
    }

    function calculateInitialState(rulesContext) {
        var initialState = {};

        var mediaInfo = rulesContext.getMediaInfo();

        var streamProcessor = rulesContext.getStreamProcessor();
        var streamInfo = rulesContext.getStreamInfo();
        var trackInfo = rulesContext.getTrackInfo();

        var isDynamic = streamProcessor.isDynamic();
        var duration = streamInfo.manifestInfo.duration;
        var fragmentDuration = trackInfo.fragmentDuration;

        var bitrates = mediaInfo.bitrateList.map(function (b) {
            return b.bandwidth;
        });
        var params = calculateParameters(MINIMUM_BUFFER_S, BUFFER_TARGET_S, bitrates, null);
        if (params === null) {
            // The best soloution is to always use the lowest bitrate...
            initialState.state = BOLA_STATE_ONE_BITRATE;
            return initialState;
        }

        initialState.state = BOLA_STATE_STARTUP;

        initialState.bitrates = bitrates;
        initialState.utilities = params.utilities;
        initialState.Vp = params.Vp;
        initialState.gp = params.gp;

        initialState.isDynamic = isDynamic;
        initialState.movieDuration = duration;
        initialState.fragmentDuration = fragmentDuration;
        initialState.bandwidthSafetyFactor = mediaPlayerModel.getBandwidthSafetyFactor();
        initialState.rebufferSafetyFactor = REBUFFER_SAFETY_FACTOR;
        initialState.bufferTarget = mediaPlayerModel.getStableBufferTime();

        initialState.lastQuality = 0;
        initialState.virtualBuffer = 0;
        initialState.throughputCount = isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD;

        if (BOLA_DEBUG) {
            var info = '';
            for (var i = 0; i < bitrates.length; ++i) {
                var u = params.utilities[i];
                var b = bitrates[i];
                var th = 0;
                if (i > 0) {
                    var u1 = params.utilities[i - 1];
                    var b1 = bitrates[i - 1];
                    th = params.Vp * ((u1 * b - u * b1) / (b - b1) + params.gp);
                }
                var z = params.Vp * (u + params.gp);
                info += '\n' + i + ':' + (0.000001 * bitrates[i]).toFixed(3) + 'Mbps ' + th.toFixed(3) + '/' + z.toFixed(3);
            }
            log('BolaDebug ' + mediaInfo.type + ' bitrates' + info);
        }

        return initialState;
    }

    function getQualityFromBufferLevel(bolaState, bufferLevel) {
        var bitrateCount = bolaState.bitrates.length;
        var quality = NaN;
        var score = NaN;
        for (var i = 0; i < bitrateCount; ++i) {
            var s = (bolaState.Vp * (bolaState.utilities[i] + bolaState.gp) - bufferLevel) / bolaState.bitrates[i];
            if (isNaN(score) || s >= score) {
                score = s;
                quality = i;
            }
        }
        return quality;
    }

    function getLastHttpRequests(metrics, count) {
        var allHttpRequests = dashMetrics.getHttpRequests(metrics);
        var httpRequests = [];

        for (var i = allHttpRequests.length - 1; i >= 0 && httpRequests.length < count; --i) {
            var request = allHttpRequests[i];
            if (request.type === _voMetricsHTTPRequest.HTTPRequest.MEDIA_SEGMENT_TYPE && request._tfinish && request.tresponse && request.trace) {
                httpRequests.push(request);
            }
        }

        return httpRequests;
    }

    function getRecentThroughput(metrics, count, mediaType) {
        // TODO: mediaType only used for debugging, remove it
        var lastRequests = getLastHttpRequests(metrics, count);
        if (lastRequests.length === 0) {
            return 0;
        }

        var totalInverse = 0;
        var msg = '';
        for (var i = 0; i < lastRequests.length; ++i) {
            // The RTT delay results in a lower throughput. We can avoid this delay in the calculation, but we do not want to.
            var downloadSeconds = 0.001 * (lastRequests[i]._tfinish.getTime() - lastRequests[i].trequest.getTime());
            var downloadBits = 8 * lastRequests[i].trace.reduce(function (prev, cur) {
                return prev + cur.b[0];
            }, 0);
            if (BOLA_DEBUG) msg += ' ' + (0.000001 * downloadBits).toFixed(3) + '/' + downloadSeconds.toFixed(3) + '=' + (0.000001 * downloadBits / downloadSeconds).toFixed(3) + 'Mbps';
            totalInverse += downloadSeconds / downloadBits;
        }

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule recent throughput = ' + (lastRequests.length / (1000000 * totalInverse)).toFixed(3) + 'Mbps:' + msg);

        return lastRequests.length / totalInverse;
    }

    function getQualityFromThroughput(bolaState, throughput) {
        // do not factor in bandwidthSafetyFactor here - it is factored at point of function invocation

        var q = 0;

        bolaState.bitrates.some(function (value, index) {
            if (value > throughput) {
                return true;
            }
            q = index;
            return false;
        });

        return q;
    }

    function getDelayFromLastFragmentInSeconds(metrics, mediaType) {
        var lastRequests = getLastHttpRequests(metrics, 1);
        if (lastRequests.length === 0) {
            return 0;
        }
        var lastRequest = lastRequests[0];
        var nowMs = Date.now();
        var lastRequestFinishMs = lastRequest._tfinish.getTime();

        if (lastRequestFinishMs > nowMs) {
            // this shouldn't happen, try to handle gracefully
            lastRequestFinishMs = nowMs;
        }

        // return the time since the finish of the last request.
        // The return will be added cumulatively to the virtual buffer, so we must be sure not to add the same delay twice.

        var lctMs = lastCallTimeDict[mediaType];
        lastCallTimeDict[mediaType] = nowMs;
        var delayMs = 0;
        if (lctMs && lctMs > lastRequestFinishMs) {
            delayMs = nowMs - lctMs;
        } else {
            delayMs = nowMs - lastRequestFinishMs;
        }

        if (delayMs <= 0) return 0;
        return 0.001 * delayMs;
    }

    function onBufferEmpty() {
        if (BOLA_DEBUG) log('BolaDebug BUFFER_EMPTY');
        // if we rebuffer, we don't want the virtual buffer to artificially raise BOLA quality
        eventMediaTypes.forEach(function (mediaType) {
            var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
            if (metrics.BolaState.length !== 0) {
                var bolaState = metrics.BolaState[0]._s;
                if (bolaState.state === BOLA_STATE_STEADY) {
                    bolaState.virtualBuffer = 0;
                    metricsModel.updateBolaState(mediaType, bolaState);
                }
            }
        });
    }

    function onPlaybackSeeking(e) {
        if (BOLA_DEBUG) log('BolaDebug PLAYBACK_SEEKING ' + e.seekTime.toFixed(3));
        // TODO: 1. Verify what happens if we seek mid-fragment.
        // TODO: 2. If e.g. we have 10s fragments and seek, we might want to download the first fragment at a lower quality to restart playback quickly.
        eventMediaTypes.forEach(function (mediaType) {
            var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
            if (metrics.BolaState.length !== 0) {
                var bolaState = metrics.BolaState[0]._s;
                if (bolaState.state !== BOLA_STATE_ONE_BITRATE) {
                    bolaState.state = BOLA_STATE_STARTUP;
                }
                metricsModel.updateBolaState(mediaType, bolaState);
            }
        });
    }

    function onPeriodSwitchStarted() {
        // TODO
    }

    function execute(rulesContext, callback) {
        var streamProcessor = rulesContext.getStreamProcessor();
        streamProcessor.getScheduleController().setTimeToLoadDelay(0);

        var switchRequest = (0, _SwitchRequest2['default'])(context).create(_SwitchRequest2['default'].NO_CHANGE, _SwitchRequest2['default'].WEAK, { name: BolaRule.__dashjs_factory_name });

        var mediaInfo = rulesContext.getMediaInfo();
        var mediaType = mediaInfo.type;
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);

        if (metrics.BolaState.length === 0) {
            // initialization

            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + '\nBolaDebug ' + mediaType + ' BolaRule for state=- fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()).toFixed(3));

            var initState = calculateInitialState(rulesContext);
            metricsModel.updateBolaState(mediaType, initState);

            var q = 0;
            if (initState.state !== BOLA_STATE_ONE_BITRATE) {
                // initState.state === BOLA_STATE_STARTUP

                eventMediaTypes.push(mediaType);

                // Bola is not invoked by dash.js to determine the bitrate quality for the first fragment. We might estimate the throughput level here, but the metric related to the HTTP request for the first fragment is usually not available.
                // TODO: at some point, we may want to consider a tweak that redownloads the first fragment at a higher quality

                var initThroughput = getRecentThroughput(metrics, initState.throughputCount, mediaType);
                if (initThroughput === 0) {
                    // We don't have information about any download yet - let someone else decide quality.
                    if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality unchanged for INITIALIZE');
                    callback(switchRequest);
                    return;
                }
                q = getQualityFromThroughput(initState, initThroughput * initState.bandwidthSafetyFactor);
                initState.lastQuality = q;
                switchRequest.value = q;
                switchRequest.priority = _SwitchRequest2['default'].DEFAULT;
                switchRequest.reason.state = initState.state;
                switchRequest.reason.throughput = initThroughput;
            }

            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality ' + q + ' for INITIALIZE');
            callback(switchRequest);
            return;
        } // initialization

        // metrics.BolaState.length > 0
        var bolaState = metrics.BolaState[0]._s;
        // TODO: does changing bolaState conform to coding style, or should we clone?

        if (bolaState.state === BOLA_STATE_ONE_BITRATE) {
            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality 0 for ONE_BITRATE');
            callback(switchRequest);
            return;
        }

        var bitrates = bolaState.bitrates;
        var utilities = bolaState.utilities;

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + '\nBolaDebug ' + mediaType + ' EXECUTE BolaRule for state=' + bolaState.state + ' fragmentStart=' + adapter.getIndexHandlerTime(rulesContext.getStreamProcessor()).toFixed(3));

        var bufferLevel = dashMetrics.getCurrentBufferLevel(metrics) ? dashMetrics.getCurrentBufferLevel(metrics) : 0;
        var recentThroughput = getRecentThroughput(metrics, bolaState.throughputCount, mediaType);

        if (bufferLevel <= 0.1) {
            // rebuffering occurred, reset virtual buffer
            bolaState.virtualBuffer = 0;
        }

        // find out if there was delay because of lack of availability or because buffer level > bufferTarget
        var timeSinceLastDownload = getDelayFromLastFragmentInSeconds(metrics, mediaType);
        if (timeSinceLastDownload > 0) {
            // TODO: maybe we should set some positive threshold here
            bolaState.virtualBuffer += timeSinceLastDownload;
        }
        if (bolaState.virtualBuffer < 0) {
            bolaState.virtualBuffer = 0;
        }

        var effectiveBufferLevel = bufferLevel + bolaState.virtualBuffer;
        var bolaQuality = getQualityFromBufferLevel(bolaState, effectiveBufferLevel);

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule bufferLevel=' + bufferLevel.toFixed(3) + '(+' + bolaState.virtualBuffer.toFixed(3) + '=' + effectiveBufferLevel.toFixed(3) + ') recentThroughput=' + (0.000001 * recentThroughput).toFixed(3) + ' tentativeQuality=' + bolaQuality);

        if (bolaState.state === BOLA_STATE_STARTUP) {
            // in startup phase, use some throughput estimation

            var q = getQualityFromThroughput(bolaState, recentThroughput * bolaState.bandwidthSafetyFactor);

            if (bufferLevel > bolaState.fragmentDuration / REBUFFER_SAFETY_FACTOR) {
                // only switch to steady state if we believe we have enough buffer to not trigger quality drop to a safeBitrate
                bolaState.state = BOLA_STATE_STEADY;

                var wantEffectiveBuffer = 0;
                for (var i = 0; i < q; ++i) {
                    // We want minimum effective buffer (bufferLevel + virtualBuffer) that gives a higher score for q when compared with any other i < q.
                    // We want
                    //     (Vp * (utilities[q] + gp) - bufferLevel) / bitrates[q]
                    // to be >= any score for i < q.
                    // We get score equality for q and i when:
                    var b = bolaState.Vp * (bolaState.gp + (bitrates[q] * utilities[i] - bitrates[i] * utilities[q]) / (bitrates[q] - bitrates[i]));
                    if (b > wantEffectiveBuffer) {
                        wantEffectiveBuffer = b;
                    }
                }
                if (wantEffectiveBuffer > bufferLevel) {
                    bolaState.virtualBuffer = wantEffectiveBuffer - bufferLevel;
                }
            }

            if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality ' + q + ' for STARTUP');
            bolaState.lastQuality = q;
            metricsModel.updateBolaState(mediaType, bolaState);
            switchRequest.value = q;
            switchRequest.priority = _SwitchRequest2['default'].DEFAULT;
            switchRequest.reason.state = BOLA_STATE_STARTUP;
            switchRequest.reason.throughput = recentThroughput;
            callback(switchRequest);
            return;
        }

        // steady state

        // we want to avoid oscillations
        // We implement the "BOLA-O" variant: when network bandwidth lies between two encoded bitrate levels, stick to the lowest level.
        if (bolaQuality > bolaState.lastQuality) {
            // do not multiply throughput by bandwidthSafetyFactor here: we are not using throughput estimation but capping bitrate to avoid oscillations
            var q = getQualityFromThroughput(bolaState, recentThroughput);
            if (bolaQuality > q) {
                // only intervene if we are trying to *increase* quality to an *unsustainable* level

                if (q < bolaState.lastQuality) {
                    // we are only avoid oscillations - do not drop below last quality
                    q = bolaState.lastQuality;
                }
                // We are dropping to an encoding bitrate which is a little less than the network bandwidth because bitrate levels are discrete. Quality q might lead to buffer inflation, so we deflate buffer to the level that q gives postive utility. This delay will be added below.
                bolaQuality = q;
            }
        }

        // Try to make sure that we can download a chunk without rebuffering. This is especially important for live streaming.
        if (recentThroughput > 0) {
            // We can only perform this check if we have a throughput estimate.
            var safeBitrate = REBUFFER_SAFETY_FACTOR * recentThroughput * bufferLevel / bolaState.fragmentDuration;
            while (bolaQuality > 0 && bitrates[bolaQuality] > safeBitrate) {
                --bolaQuality;
            }
        }

        // We do not want to overfill buffer with low quality chunks.
        // Note that there will be no delay if buffer level is below MINIMUM_BUFFER_S, probably even with some margin higher than MINIMUM_BUFFER_S.
        var delaySeconds = 0;
        var wantBufferLevel = bolaState.Vp * (utilities[bolaQuality] + bolaState.gp);
        delaySeconds = effectiveBufferLevel - wantBufferLevel;
        if (delaySeconds > 0) {
            // First reduce virtual buffer.
            // Note that this "delay" is the main mechanism of depleting virtualBuffer - the real buffer is depleted by playback.
            if (delaySeconds > bolaState.virtualBuffer) {
                delaySeconds -= bolaState.virtualBuffer;
                bolaState.virtualBuffer = 0;
            } else {
                bolaState.virtualBuffer -= delaySeconds;
                delaySeconds = 0;
            }
        }
        if (delaySeconds > 0) {
            // After depleting all virtual buffer, set delay.
            if (bolaQuality === bitrates.length - 1) {
                // At top quality, allow schedule controller to decide how far to fill buffer.
                delaySeconds = 0;
            } else {
                streamProcessor.getScheduleController().setTimeToLoadDelay(1000 * delaySeconds);
            }
        } else {
            delaySeconds = 0;
        }

        bolaState.lastQuality = bolaQuality;
        metricsModel.updateBolaState(mediaType, bolaState);

        switchRequest.value = bolaQuality;
        switchRequest.priority = _SwitchRequest2['default'].DEFAULT;
        switchRequest.reason.state = bolaState.state;
        switchRequest.reason.throughput = recentThroughput;
        switchRequest.reason.bufferLevel = bufferLevel;

        if (BOLA_DEBUG) log('BolaDebug ' + mediaType + ' BolaRule quality ' + bolaQuality + ' delay=' + delaySeconds.toFixed(3) + ' for STEADY');
        callback(switchRequest);
    }

    function reset() {
        eventBus.off(_coreEventsEvents2['default'].BUFFER_EMPTY, onBufferEmpty, instance);
        eventBus.off(_coreEventsEvents2['default'].PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.off(_coreEventsEvents2['default'].PERIOD_SWITCH_STARTED, onPeriodSwitchStarted, instance);
        setup();
    }

    instance = {
        execute: execute,
        reset: reset
    };

    setup();
    return instance;
}

BolaRule.__dashjs_factory_name = 'BolaRule';
var factory = _coreFactoryMaker2['default'].getClassFactory(BolaRule);
factory.BOLA_STATE_ONE_BITRATE = BOLA_STATE_ONE_BITRATE;
factory.BOLA_STATE_STARTUP = BOLA_STATE_STARTUP;
factory.BOLA_STATE_STEADY = BOLA_STATE_STEADY;
factory.BOLA_DEBUG = BOLA_DEBUG; // TODO: remove
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=BolaRule.js.map
