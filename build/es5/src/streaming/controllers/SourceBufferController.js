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

var _TextSourceBuffer = require('../TextSourceBuffer');

var _TextSourceBuffer2 = _interopRequireDefault(_TextSourceBuffer);

var _MediaController = require('./MediaController');

var _MediaController2 = _interopRequireDefault(_MediaController);

var _dashDashAdapter = require('../../dash/DashAdapter');

var _dashDashAdapter2 = _interopRequireDefault(_dashDashAdapter);

var _utilsErrorHandler = require('../utils/ErrorHandler');

var _utilsErrorHandler2 = _interopRequireDefault(_utilsErrorHandler);

var _StreamController = require('./StreamController');

var _StreamController2 = _interopRequireDefault(_StreamController);

var _TextTracks = require('../TextTracks');

var _TextTracks2 = _interopRequireDefault(_TextTracks);

var _utilsVTTParser = require('../utils/VTTParser');

var _utilsVTTParser2 = _interopRequireDefault(_utilsVTTParser);

var _utilsTTMLParser = require('../utils/TTMLParser');

var _utilsTTMLParser2 = _interopRequireDefault(_utilsTTMLParser);

var _modelsVideoModel = require('../models/VideoModel');

var _modelsVideoModel2 = _interopRequireDefault(_modelsVideoModel);

var _voError = require('../vo/Error');

var _voError2 = _interopRequireDefault(_voError);

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var QUOTA_EXCEEDED_ERROR_CODE = 22;

function SourceBufferController() {

    var context = this.context;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();

    var instance = undefined,
        dashManifestModel = undefined;

    function createSourceBuffer(mediaSource, mediaInfo) {

        var codec = mediaInfo.codec;
        var buffer = null;

        try {
            // Safari claims to support anything starting 'application/mp4'.
            // it definitely doesn't understand 'application/mp4;codecs="stpp"'
            // - currently no browser does, so check for it and use our own
            // implementation. The same is true for codecs="wvtt".
            if (codec.match(/application\/mp4;\s*codecs="(stpp|wvtt)"/i)) {
                throw new _voError2['default']('not really supported');
            }

            buffer = mediaSource.addSourceBuffer(codec);
        } catch (ex) {
            if (mediaInfo.isText || codec.indexOf('codecs="stpp"') !== -1 || codec.indexOf('codecs="wvtt"') !== -1) {
                buffer = (0, _TextSourceBuffer2['default'])(context).getInstance();
                buffer.setConfig({
                    errHandler: (0, _utilsErrorHandler2['default'])(context).getInstance(),
                    adapter: (0, _dashDashAdapter2['default'])(context).getInstance(),
                    dashManifestModel: dashManifestModel,
                    mediaController: (0, _MediaController2['default'])(context).getInstance(),
                    videoModel: (0, _modelsVideoModel2['default'])(context).getInstance(),
                    streamController: (0, _StreamController2['default'])(context).getInstance(),
                    textTracks: (0, _TextTracks2['default'])(context).getInstance(),
                    VTTParser: (0, _utilsVTTParser2['default'])(context).getInstance(),
                    TTMLParser: (0, _utilsTTMLParser2['default'])(context).getInstance()

                });
            } else {
                throw ex;
            }
        }

        return buffer;
    }

    function removeSourceBuffer(mediaSource, buffer) {
        try {
            mediaSource.removeSourceBuffer(buffer);
        } catch (ex) {}
    }

    function getBufferRange(buffer, time, tolerance) {
        var ranges = null;
        var start = 0;
        var end = 0;
        var firstStart = null;
        var lastEnd = null;
        var gap = 0;

        var len, i;

        var toler = tolerance || 0.15;

        try {
            ranges = buffer.buffered;
        } catch (ex) {
            return null;
        }

        if (ranges !== null && ranges !== undefined) {
            for (i = 0, len = ranges.length; i < len; i++) {
                start = ranges.start(i);
                end = ranges.end(i);
                if (firstStart === null) {
                    gap = Math.abs(start - time);
                    if (time >= start && time < end) {
                        // start the range
                        firstStart = start;
                        lastEnd = end;
                    } else if (gap <= toler) {
                        // start the range even though the buffer does not contain time 0
                        firstStart = start;
                        lastEnd = end;
                    }
                } else {
                    gap = start - lastEnd;
                    if (gap <= toler) {
                        // the discontinuity is smaller than the tolerance, combine the ranges
                        lastEnd = end;
                    } else {
                        break;
                    }
                }
            }

            if (firstStart !== null) {
                return { start: firstStart, end: lastEnd };
            }
        }

        return null;
    }

    function getAllRanges(buffer) {
        var ranges = null;

        try {
            ranges = buffer.buffered;
            return ranges;
        } catch (ex) {
            return null;
        }
    }

    function getTotalBufferedTime(buffer) {
        var ranges = getAllRanges(buffer);
        var totalBufferedTime = 0;
        var ln, i;

        if (!ranges) return totalBufferedTime;

        for (i = 0, ln = ranges.length; i < ln; i++) {
            totalBufferedTime += ranges.end(i) - ranges.start(i);
        }

        return totalBufferedTime;
    }

    function getBufferLength(buffer, time, tolerance) {

        var range, length;

        range = getBufferRange(buffer, time, tolerance);

        if (range === null) {
            length = 0;
        } else {
            length = range.end - time;
        }

        return length;
    }

    function getRangeDifference(currentRanges, buffer) {
        if (!buffer) return null;

        //TODO we may need to look for a more elegant and robust method
        // The logic below checks that is the difference between currentRanges and actual SourceBuffer ranges

        var newRanges = getAllRanges(buffer);
        var newStart, newEnd, equalStart, equalEnd, currentRange, nextCurrentRange, nextNewRange, hasRange, diff;

        if (!newRanges) return null;

        for (var i = 0, ln = newRanges.length; i < ln; i++) {
            hasRange = currentRanges.length > i;
            currentRange = hasRange ? { start: currentRanges.start(i), end: currentRanges.end(i) } : null;
            newStart = newRanges.start(i);
            newEnd = newRanges.end(i);

            // if there is no range with the same index it means that a new range has been added. This range is
            // the difference we are looking for
            // Example
            // current ranges
            // 0|---range1---|4  8|--range2--|12
            // new ranges
            // 0|---range1---|4| 8|--range2--|12  16|--range3--|20

            if (!currentRange) {
                diff = { start: newStart, end: newEnd };
                return diff;
            }

            equalStart = currentRange.start === newStart;
            equalEnd = currentRange.end === newEnd;

            // if ranges are equal do nothing here and go the next ranges
            if (equalStart && equalEnd) continue;

            // start or/and end of the range has been changed
            if (equalStart) {
                diff = { start: currentRange.end, end: newEnd };
            } else if (equalEnd) {
                diff = { start: newStart, end: currentRange.start };
            } else {
                // new range has been added before the current one
                diff = { start: newStart, end: newEnd };
                return diff;
            }

            // if there is next current range but no next new range (it it is not equal the next current range) it means
            // that the ranges have been merged
            // Example 1
            // current ranges
            // 0|---range1---|4  8|--range2--|12  16|---range3---|
            // new ranges
            // 0|-----------range1-----------|12  16|---range3--|
            nextCurrentRange = currentRanges.length > i + 1 ? { start: currentRanges.start(i + 1), end: currentRanges.end(i + 1) } : null;
            nextNewRange = i + 1 < ln ? { start: newRanges.start(i + 1), end: newRanges.end(i + 1) } : null;

            if (nextCurrentRange && (!nextNewRange || nextNewRange.start !== nextCurrentRange.start || nextNewRange.end !== nextCurrentRange.end)) {
                diff.end = nextCurrentRange.start;
            }

            return diff;
        }

        return null;
    }

    function append(buffer, chunk) {
        var bytes = chunk.bytes;
        var appendMethod = 'append' in buffer ? 'append' : 'appendBuffer' in buffer ? 'appendBuffer' : null;
        // our user-defined sourcebuffer-like object has Object as its
        // prototype whereas built-in SourceBuffers will have something
        // more sensible. do not pass chunk to built-in append.
        var acceptsChunk = Object.prototype.toString.call(buffer).slice(8, -1) === 'Object';

        if (!appendMethod) return;

        try {
            waitForUpdateEnd(buffer, function () {
                if (acceptsChunk) {
                    // chunk.start is used in calculations by TextSourceBuffer
                    buffer[appendMethod](bytes, chunk);
                } else {
                    buffer[appendMethod](bytes);
                }
                // updating is in progress, we should wait for it to complete before signaling that this operation is done
                waitForUpdateEnd(buffer, function () {
                    eventBus.trigger(_coreEventsEvents2['default'].SOURCEBUFFER_APPEND_COMPLETED, { buffer: buffer, bytes: bytes });
                });
            });
        } catch (err) {
            eventBus.trigger(_coreEventsEvents2['default'].SOURCEBUFFER_APPEND_COMPLETED, { buffer: buffer, bytes: bytes, error: new _voError2['default'](err.code, err.message, null) });
        }
    }

    function remove(buffer, start, end, mediaSource) {

        try {
            // make sure that the given time range is correct. Otherwise we will get InvalidAccessError
            waitForUpdateEnd(buffer, function () {
                if (start >= 0 && end > start && mediaSource.readyState !== 'ended') {
                    buffer.remove(start, end);
                }
                // updating is in progress, we should wait for it to complete before signaling that this operation is done
                waitForUpdateEnd(buffer, function () {
                    eventBus.trigger(_coreEventsEvents2['default'].SOURCEBUFFER_REMOVE_COMPLETED, { buffer: buffer, from: start, to: end });
                });
            });
        } catch (err) {
            eventBus.trigger(_coreEventsEvents2['default'].SOURCEBUFFER_REMOVE_COMPLETED, { buffer: buffer, from: start, to: end, error: new _voError2['default'](err.code, err.message, null) });
        }
    }

    function abort(mediaSource, buffer) {
        try {
            if (mediaSource.readyState === 'open') {
                buffer.abort();
            } else if (buffer.setTextTrack && mediaSource.readyState === 'ended') {
                buffer.abort(); //The cues need to be removed from the TextSourceBuffer via a call to abort()
            }
        } catch (ex) {}
    }

    function setConfig(config) {
        if (!config) return;

        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
    }

    function waitForUpdateEnd(buffer, callback) {
        var intervalId;
        var CHECK_INTERVAL = 50;

        var checkIsUpdateEnded = function checkIsUpdateEnded() {
            // if updating is still in progress do nothing and wait for the next check again.
            if (buffer.updating) return;
            // updating is completed, now we can stop checking and resolve the promise
            clearInterval(intervalId);
            callback();
        };

        var updateEndHandler = function updateEndHandler() {
            if (buffer.updating) return;

            buffer.removeEventListener('updateend', updateEndHandler, false);
            callback();
        };

        if (!buffer.updating) {
            callback();
            return;
        }

        // use updateend event if possible
        if (typeof buffer.addEventListener === 'function') {
            try {
                buffer.addEventListener('updateend', updateEndHandler, false);
            } catch (err) {
                // use setInterval to periodically check if updating has been completed
                intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
            }
        } else {
            // use setInterval to periodically check if updating has been completed
            intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        }
    }

    instance = {
        append: append,
        remove: remove,
        abort: abort,
        createSourceBuffer: createSourceBuffer,
        removeSourceBuffer: removeSourceBuffer,
        getBufferRange: getBufferRange,
        getAllRanges: getAllRanges,
        getTotalBufferedTime: getTotalBufferedTime,
        getBufferLength: getBufferLength,
        getRangeDifference: getRangeDifference,
        setConfig: setConfig
    };

    return instance;
}

SourceBufferController.__dashjs_factory_name = 'SourceBufferController';
var factory = _coreFactoryMaker2['default'].getSingletonFactory(SourceBufferController);
factory.QUOTA_EXCEEDED_ERROR_CODE = QUOTA_EXCEEDED_ERROR_CODE;
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=SourceBufferController.js.map
