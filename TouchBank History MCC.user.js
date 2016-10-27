// ==UserScript==
// @name         TouchBank History MCC
// @namespace    https://github.com/vr1974/touchbank_history_mcc
// @version      0.3
// @description  Show MCC in history in internet bank of TouchBank
// @author       alezhu + v.r.
// @match        https://www.touchbank.com/lk/cards*
// @grant        none
// @source       https://github.com/vr1974/touchbank_history_mcc/raw/master/TouchBank%20History%20MCC.user.js
// @updateURL    https://github.com/vr1974/touchbank_history_mcc/raw/master/TouchBank%20History%20MCC.user.js
// @downloadURL  https://github.com/vr1974/touchbank_history_mcc/raw/master/TouchBank%20History%20MCC.user.js
// ==/UserScript==
/* jshint -W097 */
'use strict';

(function(window, angular, $) {
    var LOG = 0;
    if (LOG) console.log('TouchBank History MCC');

    function _waitDfd(dfd, context, waitFn) {
        if (waitFn(context)) {
            return dfd.resolve(context);
        }
        return setTimeout(function() {
            _waitDfd(dfd, context, waitFn);
        }, 1);
    }

    function _wait(context, waitFn) {
        var dfd = $.Deferred();
        _waitDfd(dfd, context, waitFn);
        return dfd;
    }


    function getAccount() {
        return _wait({}, function(context) {
            context.account = angular.element('div[ui-view^="AccountModule"]');
            if (context.account.length > 0 && angular.isDefined(context.account.scope)) {
                context.scope = context.account.scope();
                if (angular.isDefined(context.scope) && angular.isDefined(context.scope.model)) {
                    return true;
                }
            }
            return false;
        });
    }

    function ReplaceAccountTemplateHTML(htmlOrig) {
        return htmlOrig.replace(/(<td[^>]+>)\s*({{\s*historyItem.operationComment\s*}})/i, '$1<span ng-if="historyItem.mcccode">MCC: {{historyItem.mcccode}}&nbsp;</span>$2');
    }

    function replaceTemplate($templateCache, url) {
        return _wait({
            $templateCache: $templateCache,
            url: url
        }, function(context) {
            context.html = null;
            var tmpl = context.$templateCache.get(context.url);
            if (angular.isDefined(tmpl)) {
                if (angular.isString(tmpl)) {
                    context.html = tmpl = ReplaceAccountTemplateHTML(tmpl);
                } else if (angular.isArray(tmpl)) {
                    context.html = tmpl[1] = ReplaceAccountTemplateHTML(tmpl[1]);
                }
                if (context.html !== null) {
                    context.$templateCache.put(context.url, tmpl);
                    return true;
                }
            }
            return false;
        });
    }

    function getHistoryOperations(account) {
        return _wait({
            account: account
        }, function(context) {
            context.operations = context.account.find('.history-operations');
            return context.operations.length > 0;
        });
    }


    function processAccount() {
        getAccount().done(function(context) {
            if (LOG) console.log('Account found');
            var account = context.account;
            if (LOG) console.log('scope:', context.scope.$id);
            var scope = context.scope;
            scope.cardsReplaced = false;
            account.injector().invoke(function($compile, $http, $templateCache, $rootScope) {
                if (LOG) console.log('Inject');
                ///static/otp
                var url = $rootScope.ResourceRoot + "/widgets/account/view/history/card.html";
                if (LOG) console.log('URL' + url);
                scope.$watch('model.type', function(newValue, oldValue, scope) {
                    if (LOG) console.log('model.type:', oldValue, '->', newValue);
                    if (newValue === 'cards' && !scope.cardsReplaced) {
                        replaceTemplate($templateCache, url).done(function(context) {
                            getHistoryOperations(account).done(function(context) {
                                //debugger;
                                var parent = context.operations.parent();
                                parent.html(context.html);
                                $compile(parent)(scope);
                                scope.cardsReplaced = true;
                            });
                        });
                    }
                });
            });
        });
    }

    function getAccountItems() {
        return _wait({}, function(context) {
            context.items = angular.element('tr[ng-repeat="historyItem in model.history"]');
            return context.items.length > 0;
        });
    }
    
    function processAccount1() {
        getAccountItems().done(function(context) {
            if (LOG) console.log('Account found');
            var table = context.items.parent().parent();
            var scope = table.scope();
            table.injector().invoke(function($compile, $http, $rootScope) {
                var url = $rootScope.ResourceRoot + "/widgets/account/view/history/card.html";
                if (LOG) console.log('URL = ' + url);
                $http.get(url).then(function(response) {
                    var start = response.data.indexOf('class="widget-block-body"');
                    if (LOG) console.log('STA = ' + start);
                    if (start >= 0) {
                        start = response.data.indexOf('<tr', start);
                        if (start >= 0) {
                            var end = response.data.indexOf('</table>', start);
                            if (end >= 0) {
                                var html = response.data.substring(start, end);
                                html = html.replace(/({{\s*historyItem.operationComment\s*}})/i, '<span ng-if="historyItem.mcccode">MCC: {{historyItem.mcccode}} / loyaltyGroup: {{historyItem.loyaltyGroup}} / isFavorite: {{historyItem.isFavorite}} / loyaltyPoints: {{historyItem.loyaltyPoints}}&nbsp;<br /></span>$1');
                                table.html(html);
                                $compile(table)(scope);
                                //scope.$digest();
                            }
                        }
                    }
                });
            });
        });
    }
    
    function getHistoryItems() {
        return _wait({}, function(context) {
            context.items = angular.element('tr[ng-repeat="historyItem in model.history"]');
            return context.items.length > 0;
        });
    }

    function processHistory() {
        getHistoryItems().done(function(context) {
            if (LOG) console.log('History founded');
            var table = context.items.parent().parent();
            var scope = table.scope();
            table.injector().invoke(function($compile, $http, $rootScope) {
                var url = $rootScope.ResourceRoot + "/widgets/cards/view/dashboard.html";
                $http.get(url).then(function(response) {
                    var start = response.data.indexOf('ng-if="model.history"');
                    if (start >= 0) {
                        start = response.data.indexOf('<tr', start);
                        if (start >= 0) {
                            var end = response.data.indexOf('</table>', start);
                            if (end >= 0) {
                                var html = response.data.substring(start, end);
                                html = html.replace(/({{\s*historyItem.operationComment\s*}})/i, '<span ng-if="historyItem.mcccode">MCC: {{historyItem.mcccode}}&nbsp;</span>$1');
                                table.html(html);
                                $compile(table)(scope);
                                //scope.$digest();
                            }
                        }
                    }
                });
            });
        });
    }

    angular.element(document).ready(function() {
        if (LOG) console.log('ready');
        if (window.location.href.indexOf('cards/account') >= 0) {
            if (LOG) console.log('processAccount');
            processAccount1();
        } else {
            if (LOG) console.log('processHistory');
            processHistory();
        }
    });

})(window, window.angular, window.jQuery);
