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

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _dashUtilsTimelineConverter = require('../../../dash/utils/TimelineConverter');

var _dashUtilsTimelineConverter2 = _interopRequireDefault(_dashUtilsTimelineConverter);

var _LiveEdgeBinarySearchRule = require('./LiveEdgeBinarySearchRule');

var _LiveEdgeBinarySearchRule2 = _interopRequireDefault(_LiveEdgeBinarySearchRule);

var _LiveEdgeWithTimeSynchronizationRule = require('./LiveEdgeWithTimeSynchronizationRule');

var _LiveEdgeWithTimeSynchronizationRule2 = _interopRequireDefault(_LiveEdgeWithTimeSynchronizationRule);

var _dashDashAdapter = require('../../../dash/DashAdapter');

var _dashDashAdapter2 = _interopRequireDefault(_dashDashAdapter);

var TIME_SYNCHRONIZED_RULES = 'withAccurateTimeSourceRules';
var BEST_GUESS_RULES = 'bestGuestRules';

function SynchronizationRulesCollection() {

    var context = this.context;

    var instance = undefined,
        withAccurateTimeSourceRules = undefined,
        bestGuestRules = undefined;

    function initialize() {
        withAccurateTimeSourceRules = [];
        bestGuestRules = [];

        withAccurateTimeSourceRules.push((0, _LiveEdgeWithTimeSynchronizationRule2['default'])(context).create({
            timelineConverter: (0, _dashUtilsTimelineConverter2['default'])(context).getInstance()
        }));

        bestGuestRules.push((0, _LiveEdgeBinarySearchRule2['default'])(context).create({
            timelineConverter: (0, _dashUtilsTimelineConverter2['default'])(context).getInstance(),
            adapter: (0, _dashDashAdapter2['default'])(context).getInstance()
        }));
    }

    function getRules(type) {
        switch (type) {
            case TIME_SYNCHRONIZED_RULES:
                return withAccurateTimeSourceRules;
            case BEST_GUESS_RULES:
                return bestGuestRules;
            default:
                return null;
        }
    }

    instance = {
        initialize: initialize,
        getRules: getRules
    };

    return instance;
}

SynchronizationRulesCollection.__dashjs_factory_name = 'SynchronizationRulesCollection';
var factory = _coreFactoryMaker2['default'].getSingletonFactory(SynchronizationRulesCollection);
factory.TIME_SYNCHRONIZED_RULES = TIME_SYNCHRONIZED_RULES;
factory.BEST_GUESS_RULES = BEST_GUESS_RULES;
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=SynchronizationRulesCollection.js.map
