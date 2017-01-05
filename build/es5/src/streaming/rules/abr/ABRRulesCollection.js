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

var _ThroughputRule = require('./ThroughputRule');

var _ThroughputRule2 = _interopRequireDefault(_ThroughputRule);

var _BufferOccupancyRule = require('./BufferOccupancyRule');

var _BufferOccupancyRule2 = _interopRequireDefault(_BufferOccupancyRule);

var _InsufficientBufferRule = require('./InsufficientBufferRule');

var _InsufficientBufferRule2 = _interopRequireDefault(_InsufficientBufferRule);

var _AbandonRequestsRule = require('./AbandonRequestsRule');

var _AbandonRequestsRule2 = _interopRequireDefault(_AbandonRequestsRule);

var _BolaRule = require('./BolaRule');

var _BolaRule2 = _interopRequireDefault(_BolaRule);

var _BolaAbandonRule = require('./BolaAbandonRule');

var _BolaAbandonRule2 = _interopRequireDefault(_BolaAbandonRule);

var _modelsMediaPlayerModel = require('../../models/MediaPlayerModel');

var _modelsMediaPlayerModel2 = _interopRequireDefault(_modelsMediaPlayerModel);

var _modelsMetricsModel = require('../../models/MetricsModel');

var _modelsMetricsModel2 = _interopRequireDefault(_modelsMetricsModel);

var _dashDashMetrics = require('../../../dash/DashMetrics');

var _dashDashMetrics2 = _interopRequireDefault(_dashDashMetrics);

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var QUALITY_SWITCH_RULES = 'qualitySwitchRules';
var ABANDON_FRAGMENT_RULES = 'abandonFragmentRules';

function ABRRulesCollection() {

    var context = this.context;

    var instance = undefined,
        qualitySwitchRules = undefined,
        abandonFragmentRules = undefined;

    function initialize() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];

        var metricsModel = (0, _modelsMetricsModel2['default'])(context).getInstance();
        var dashMetrics = (0, _dashDashMetrics2['default'])(context).getInstance();
        var mediaPlayerModel = (0, _modelsMediaPlayerModel2['default'])(context).getInstance();

        if (mediaPlayerModel.getBufferOccupancyABREnabled()) {
            qualitySwitchRules.push((0, _BolaRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: (0, _dashDashMetrics2['default'])(context).getInstance()
            }));
            abandonFragmentRules.push((0, _BolaAbandonRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: (0, _dashDashMetrics2['default'])(context).getInstance()
            }));
        } else {
            qualitySwitchRules.push((0, _ThroughputRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics
            }));

            qualitySwitchRules.push((0, _BufferOccupancyRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics
            }));

            qualitySwitchRules.push((0, _InsufficientBufferRule2['default'])(context).create({ metricsModel: metricsModel }));
            abandonFragmentRules.push((0, _AbandonRequestsRule2['default'])(context).create());
        }
    }

    function getRules(type) {
        switch (type) {
            case QUALITY_SWITCH_RULES:
                return qualitySwitchRules;
            case ABANDON_FRAGMENT_RULES:
                return abandonFragmentRules;
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

ABRRulesCollection.__dashjs_factory_name = 'ABRRulesCollection';
var factory = _coreFactoryMaker2['default'].getSingletonFactory(ABRRulesCollection);
factory.QUALITY_SWITCH_RULES = QUALITY_SWITCH_RULES;
factory.ABANDON_FRAGMENT_RULES = ABANDON_FRAGMENT_RULES;
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=ABRRulesCollection.js.map
