'use strict';

angular.module('mms.directives')
.directive('mmsTranscludeCom', ['ElementService', 'UtilsService', '$log', '$compile', 'growl', mmsTranscludeCom]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsTranscludeCom
 *
 * @requires mms.ElementService
 * @requires mms.UtilsService
 * @requires $compile
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's documentation binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and doc change,
 * and on click. Nested transclusions inside the documentation will also be registered.
 *
 * @param {string} mmsEid The id of the element whose doc to transclude
 * @param {string=master} mmsWs Workspace to use, defaults to master
 * @param {string=latest} mmsVersion Version can be alfresco version number or timestamp, default is latest
 */
function mmsTranscludeCom(ElementService, UtilsService, $log, $compile, growl) {

    var mmsTranscludeComLink = function(scope, element, attrs, mmsViewCtrl) {
        scope.cfType = 'doc';
        element.click(function(e) {
            if (mmsViewCtrl)
                mmsViewCtrl.transcludeClicked(scope.mmsEid);
            if (e.target.tagName !== 'A')
                return false;
        });

        var recompile = function() {
            element.empty();
            var doc = scope.element.documentation;
            doc += ' - ' + scope.element.author;
            element.append(doc);
            $compile(element.contents())(scope); 
            //if (mmsViewCtrl) {
            //    mmsViewCtrl.elementTranscluded(scope.element);
            //}
        };

        scope.$watch('mmsEid', function(newVal, oldVal) {
            if (!newVal)
                return;
            if (UtilsService.hasCircularReference(scope, scope.mmsEid, 'doc')) {
                //$log.log("prevent circular dereference!");
                element.html('<span class="error">Circular Reference!</span>');
                return;
            }
            var ws = scope.mmsWs;
            var version = scope.mmsVersion;
            if (mmsViewCtrl) {
                var viewVersion = mmsViewCtrl.getWsAndVersion();
                if (!ws)
                    ws = viewVersion.workspace;
                if (!version)
                    version = viewVersion.version;
            }
            ElementService.getElement(scope.mmsEid, false, ws, version)
            .then(function(data) {
                scope.element = data;
                recompile();
                scope.$watch('element.documentation', recompile);
            }, function(reason) {
                growl.error('Cf Comment Error: ' + reason.message);
            });
        });
    };

    return {
        restrict: 'E',
        scope: {
            mmsEid: '@',
            mmsWs: '@',
            mmsVersion: '@'
        },
        require: '?^mmsView',
        //controller: ['$scope', controller]
        link: mmsTranscludeComLink
    };
}