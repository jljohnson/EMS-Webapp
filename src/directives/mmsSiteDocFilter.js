'use strict';

angular.module('mms.directives')
.directive('mmsSiteDocFilter', ['ElementService', 'ViewService', 'growl', '$templateCache', '$q', mmsSiteDocFilter]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsSiteDocFilter
 *
 * @requires mms.ElementService
 * @requires mms.ViewService
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's name binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and name change,
 * and on click
 *
 * @param {string} mmsSite The site id of documents to filter
 * @param {string=master} mmsWs Workspace to use, defaults to master
 * @param {string=latest} mmsVersion Version can be alfresco version number or timestamp, default is latest
 */
function mmsSiteDocFilter(ElementService, ViewService, growl, $templateCache, $q) {

    var mmsSiteDocFilterLink = function(scope, element, attrs) {
        scope.filtered = [];
        var editable = true;
        var orig = null;
        scope.siteDocs = [];
        scope.siteDocsFiltered = [];
        var siteDocsViewId = scope.mmsSite + '_filtered_docs';
        scope.editing = false;
        
        ElementService.getElement(siteDocsViewId, false, scope.mmsWs, scope.mmsVersion)
        .then(function(data) {
            orig = data;
            scope.filtered = JSON.parse(data.documentation);
            if (!data.editable)
                editable = false;
            ViewService.getSiteDocuments(scope.mmsSite, false, scope.mmsWs, scope.mmsVersion)
            .then(function(docs) {
                docs.forEach(function(doc) {
                    scope.siteDocs.push({show: scope.filtered.indexOf(doc.sysmlid) < 0, doc: doc});
                });
                updateSiteDocsFiltered();
            }, function(reason) {
                editable = false;
            });
        }, function(reason) {
            editable = false;
        });
        
        if (scope.mmsVersion && scope.mmsVersion !== 'latest')
            editable = false;

        var updateSiteDocsFiltered = function() {
            scope.siteDocsFiltered = [];
            scope.siteDocs.forEach(function(doc) {
                if (doc.show)
                    scope.siteDocsFiltered.push(doc.doc);
            });
        };

        var cancel = function() {
            if (orig) {
                scope.filtered = JSON.parse(orig.documentation);
                scope.siteDocs.forEach(function(doc) {
                    if (scope.filtered.indexOf(doc.doc.sysmlid) < 0)
                        doc.show = true;
                    else
                        doc.show = false;
                });
                updateSiteDocsFiltered();
            }
        };

        var save = function() {
            var deferred = $q.defer();
            if (!editable || !scope.editing) {
                deferred.resolve("ok");
                return deferred.promise;
            }
            ElementService.updateElement({
                sysmlid: siteDocsViewId, 
                documentation: JSON.stringify(scope.filtered)
            }, scope.mmsWs).then(function(data) {
                updateSiteDocsFiltered();
                deferred.resolve(data);
                scope.editing = false;
            }, function(reason) {
                deferred.reject({type: 'error', message: reason.message});
            });
            return deferred.promise;
        };

        var toggleCheck = function(id) {
            var index = scope.filtered.indexOf(id);
            if (index < 0)
                scope.filtered.push(id);
            else
                scope.filtered.splice(index, 1);
            updateSiteDocsFiltered(); //shoudl only on save
        };

        scope.toggleCheck = toggleCheck;
        scope.save = save;
        scope.cancel = cancel;

        if (scope.mmsApi) {
            scope.mmsApi.save = save;
            scope.mmsApi.cancel = cancel;
            scope.mmsApi.setEditing = function(mode) {
                if (editable && mode)
                    scope.editing = true;
                else
                    scope.editing = false;
            };
            scope.mmsApi.getEditing = function() {
                return scope.editing;
            };
        }
    };

    return {
        template: $templateCache.get('mms/templates/mmsSiteDocFilter.html'),
        restrict: 'E',
        scope: {
            mmsSite: '@',
            mmsWs: '@',
            mmsVersion: '@',
            mmsApi: '='
        },
        link: mmsSiteDocFilterLink
    };
}