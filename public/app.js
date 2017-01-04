/*
 * Copyright 2016  IBM Corp.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

"use strict";

// Base URLs and endpoints
const wchLoginApiGateway = "https://my.digitalexperience.ibm.com/api/";
// Content Hub blueid username and password - replace these or add code to get these from inputs
const username = "[username]";
const password = "[password]";

// Empty elements for Article content type
var emptyElements = {
    "body": {
        "elementType": "text",
        "value": ""
    },
    "title": {
        "elementType": "text",
        "value": ""
    },
    "image": {
        "elementType": "image",
        "renditions": {},
        "asset": {}
    },
    "publishDate": {
        "elementType": "datetime",
        "value": ""
    },
    "author": {
        "elementType": "text",
        "value": ""
    },
    "category": {
        "elementType": "category"
    },
    "summary": {
        "elementType": "text",
        "value": ""
    }
};

const wchLoginURL = wchLoginApiGateway + "login/v1/basicauth";
const contentService = "authoring/v1/content";
const resourceService = "authoring/v1/resources";
const assetService = "authoring/v1/assets";
const searchService = "authoring/v1/search";

var baseTenantUrl;

// Login, upload resource, create asset, and create content item
function createContentItem(contentTypeName, contentName, file, textData) {
    // start with a copy of the empty elements structure for article content type
    var elements = JSON.parse(JSON.stringify(emptyElements));
    if (!file) {
        return Promise.reject('No image file specified');
    }
    // 1. login
    return wchLogin(username, password)
        .then(function(baseUrl) {
            baseTenantUrl = baseUrl; // save this for other calls
            // 2. Upload resource and create asset
            return wchCreateResource(file);
        })
        .then(function(resourceJson) {
            var id = resourceJson.id;
            // console.log("resource: ", resourceJson);
            // 3. Create asset using ID from resource upload
            return wchCreateAssetFromResource(id, file.name);
        })
        .then(function(assetJson) {
            // console.log("asset: ", assetJson);
            // set image properties in contentElements
            var image = elements.image;
            image.elementType = "image";
            image.asset = {
                id: assetJson.id
            };
            image.renditions = {
                default: {
                    id: assetJson.renditions.id
                }
            };

            // 4. search for content type by name
            var searchParams = "q=*:*&fl=name,id&wt=json&fq=classification:content-type&fq=name:" + contentTypeName;
            return wchSearch(searchParams);
        })
        .then(function(searchResults) {
            if (searchResults.numFound == 0) {
                return Promise.reject('Content type not found: ' + contentTypeName);
            }
            var id = searchResults.documents[0].id;
            var contentTypeId = id.substring(id.indexOf(":") + 1);
            // Populate all the text fields in the elements
            Object.keys(textData).forEach(function(key) {
                elements[key].value = textData[key];
            });
            // 5. create content item
            return wchCreateContentItem(contentName, contentTypeId, elements);
        });
};

// Call login - callback has baseURL argument
function wchLogin(user, pass) {
    var requestOptions = {
        xhrFields: {
            withCredentials: true
        },
        url: wchLoginURL,
        headers: {
            "Authorization": "Basic " + btoa(user + ":" + pass)
        }
    };
    // Call login
    return $.ajax(requestOptions).then(function(data, textStatus, request) {
        return request.getResponseHeader('x-ibm-dx-tenant-base-url'); // use this to get tenant from the basicauth call
    });
}

// Upload a file to create a resource. baseTenantUrl must already be set
function wchCreateResource(file) {
    var createResourceUrl = baseTenantUrl + '/' + resourceService + "?name=" + file.name;
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open("post", createResourceUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = function() {
            if (this.status >= 200 && this.status < 300) {
                console.log('OK');
                resolve(JSON.parse(xhr.response));
            } else {
                console.log('bad HTTP status');
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function() {
            console.log('error');
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send(file);
    });
}

// Creates an asset from a resource ID
function wchCreateAssetFromResource(resourceId, filename) {
    var createAssetUrl = baseTenantUrl + '/' + assetService;
    var reqOptions = {
        xhrFields: {
            withCredentials: true
        },
        dataType: "json",
        type: "POST",
        data: JSON.stringify({ resource: resourceId, path: '/dxdam/' + filename, name: filename }),
        contentType: "application/json",
        // mediaType: mimeType,                
        url: createAssetUrl
    };
    // Post to assets service
    return $.ajax(reqOptions).done(function(json) {
        return json;
    });
}

// Search - callback has search results object
function wchSearch(searchParams) {
    // console.log('searchParams: ', searchParams);
    var searchURL = baseTenantUrl + '/' + searchService + "?" + searchParams;
    var reqOptions = {
        xhrFields: {
            withCredentials: true
        },
        dataType: "json",
        url: searchURL,
    };
    return $.ajax(reqOptions).then(function(json) {
        return json;
    });
}

// create content item - callback has new content item object
function wchCreateContentItem(name, contentTypeId, contentElements) {
    // console.log('createContentItem baseTenantUrl: ', baseTenantUrl);
    var createContentUrl = baseTenantUrl + '/' + contentService;
    var data = {
        "name": name,
        "typeId": contentTypeId,
        "tags": [],
        "status": "draft",
        "links": {},
        "elements": contentElements
    };
    var reqOptions = {
        xhrFields: {
            withCredentials: true
        },
        dataType: "json",
        contentType: "application/json",
        type: "POST",
        data: JSON.stringify(data),
        url: createContentUrl
    };
    // console.log(JSON.stringify(reqOptions, "", 4));
    // Post to Content service
    return $.ajax(reqOptions).done(function(json) {
        return json;
    });

}