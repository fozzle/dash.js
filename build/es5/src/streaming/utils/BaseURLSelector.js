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

var _coreEventBus = require('../../core/EventBus');

var _coreEventBus2 = _interopRequireDefault(_coreEventBus);

var _coreEventsEvents = require('../../core/events/Events');

var _coreEventsEvents2 = _interopRequireDefault(_coreEventsEvents);

var _dashModelsDashManifestModel = require('../../dash/models/DashManifestModel');

var _dashModelsDashManifestModel2 = _interopRequireDefault(_dashModelsDashManifestModel);

var _controllersBlacklistController = require('../controllers/BlacklistController');

var _controllersBlacklistController2 = _interopRequireDefault(_controllersBlacklistController);

var _rulesBaseUrlResolutionDVBSelector = require('../rules/baseUrlResolution/DVBSelector');

var _rulesBaseUrlResolutionDVBSelector2 = _interopRequireDefault(_rulesBaseUrlResolutionDVBSelector);

var _rulesBaseUrlResolutionBasicSelector = require('../rules/baseUrlResolution/BasicSelector');

var _rulesBaseUrlResolutionBasicSelector2 = _interopRequireDefault(_rulesBaseUrlResolutionBasicSelector);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE = 1;
var URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE = 'Failed to resolve a valid URL';

function BaseURLSelector() {

    var context = this.context;
    var eventBus = (0, _coreEventBus2['default'])(context).getInstance();
    var dashManifestModel = (0, _dashModelsDashManifestModel2['default'])(context).getInstance();

    var instance = undefined,
        serviceLocationBlacklistController = undefined,
        basicSelector = undefined,
        dvbSelector = undefined,
        selector = undefined;

    function setup() {
        serviceLocationBlacklistController = (0, _controllersBlacklistController2['default'])(context).create({
            updateEventName: _coreEventsEvents2['default'].SERVICE_LOCATION_BLACKLIST_CHANGED,
            loadFailedEventName: _coreEventsEvents2['default'].FRAGMENT_LOADING_COMPLETED
        });

        basicSelector = (0, _rulesBaseUrlResolutionBasicSelector2['default'])(context).create({
            blacklistController: serviceLocationBlacklistController
        });

        dvbSelector = (0, _rulesBaseUrlResolutionDVBSelector2['default'])(context).create({
            blacklistController: serviceLocationBlacklistController
        });

        selector = basicSelector;
    }

    function chooseSelectorFromManifest(manifest) {
        if (dashManifestModel.getIsDVB(manifest)) {
            selector = dvbSelector;
        } else {
            selector = basicSelector;
        }
    }

    function select(data) {
        var baseUrls = data.baseUrls;
        var selectedIdx = data.selectedIdx;

        // Once a random selection has been carried out amongst a group of BaseURLs with the same
        // @priority attribute value, then that choice should be re-used if the selection needs to be made again
        // unless the blacklist has been modified or the available BaseURLs have changed.
        if (!isNaN(selectedIdx)) {
            return baseUrls[selectedIdx];
        }

        var selectedBaseUrl = selector.select(baseUrls);

        if (!selectedBaseUrl) {
            eventBus.trigger(_coreEventsEvents2['default'].URL_RESOLUTION_FAILED, {
                error: new Error(URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE, URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE)
            });

            return;
        }

        data.selectedIdx = baseUrls.indexOf(selectedBaseUrl);

        return selectedBaseUrl;
    }

    function reset() {
        serviceLocationBlacklistController.reset();
    }

    instance = {
        chooseSelectorFromManifest: chooseSelectorFromManifest,
        select: select,
        reset: reset
    };

    setup();

    return instance;
}

BaseURLSelector.__dashjs_factory_name = 'BaseURLSelector';
var factory = _coreFactoryMaker2['default'].getClassFactory(BaseURLSelector);
factory.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE = URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE;
factory.URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE = URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE;
exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=BaseURLSelector.js.map
