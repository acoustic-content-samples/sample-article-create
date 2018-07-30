/*
 * Copyright IBM Corp. 2016,2017,2018
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

"use strict";

// The API URL, along with the host and content hub id for your tenant, may be
// found in the "Hub Information" dialog off the "User menu" in the authoring UI
// Update the following URL with the value from that Hub Information dialog.
const baseTenantAPIURL = "https://{Host}/api/{Tenant ID}";

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

const wchLoginURL = baseTenantAPIURL + "/login/v1/basicauth";
const contentService = "authoring/v1/content";
const assetService = "authoring/v1/assets";
const searchService = "authoring/v1/search";

function wchLogin(username, password, cb) {
    //alert("U: " + username + " P: " + password + " URL: " + wchLoginURL);
    var requestOptions = {
        xhrFields: { withCredentials: true },
        url: wchLoginURL,
        headers: { "Authorization": "Basic " + btoa(username + ":" + password) }
    };
    $.ajax(requestOptions).done(function(data, textStatus, request) {
        cb();
    }).fail(function(request, textStatus, err) {
        let errMsg = (request && request.responseJSON && request.responseJSON.errors && request.responseJSON.errors[0].message) ?
            request.responseJSON.errors[0].message : err;
        alert("Content Hub Login returned an error: " + errMsg + " Please Try Again.");
    });
}

// Login, upload resource, create asset, and create content item
function createContentItem(contentTypeName, contentName, file, textData) {
    // start with a copy of the empty elements structure for article content type
    var elements = JSON.parse(JSON.stringify(emptyElements));
    if (!file) {
        return Promise.reject('No image file specified');
    }
    return wchCreateAssetWithResource(file) // Upload resource and create asset
        .then(function(assetJson) {
            console.log("asset: ", assetJson);
            // set image properties in contentElements
            var image = elements.image;
            image.elementType = "image";
            image.asset = {
                id: assetJson.id
            };
            image.renditions["default"] = {
                    renditionId: assetJson.renditions["default"].id
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

// Creates an asset with the given resource. Must have done login already.
function wchCreateAssetWithResource(file) {
  var createAssetUrl = baseTenantAPIURL + '/' + assetService;
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open("POST", createAssetUrl, true);
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
    // Construct form data
    var data = JSON.stringify({ path: '/dxdam/' + file.name, name: file.name });
    var formData = new FormData();
    formData.append("resource", file, file.name);
    formData.append("data", data);
    // Post to assets service
    xhr.send(formData);
  });
}

// Search - callback has search results object
function wchSearch(searchParams) {
    // console.log('searchParams: ', searchParams);
    var searchURL = baseTenantAPIURL + '/' + searchService + "?" + searchParams;
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
    // console.log('createContentItem baseTenantAPIURL: ', baseTenantAPIURL);
    var createContentUrl = baseTenantAPIURL + '/' + contentService;
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


// Login, upload resource, create asset, and update content item
function updateContentItem(contentId,file, textData) {
	 // start with a copy of the empty elements structure for article content type
    var elements = JSON.parse(JSON.stringify(emptyElements));
	if (!file) {
        return Promise.reject('No image file specified');
    }
    return wchCreateResource(file) // Upload resource and create asset
        .then(function(resourceJson) {
            var id = resourceJson.id;
             // Create asset using ID from resource upload
            return wchCreateAssetFromResource(id, file.name);
        })
        .then(function(assetJson) {
             // set image properties in contentElements
            var image = elements.image;

            image.elementType = "image";
            image.asset = {
                id: assetJson.id
            };
            image.renditions["default"] = {
                    renditionId: assetJson.renditions["default"].id
            };

            // update content item
		    return wchUpdateContentItem(contentId, textData,elements);
        });
};



// Get the current version of the content item, update the fields locally and then update it in the WCH Content service via HTTP PUT
function wchUpdateContentItem(updateContentId,contentElements,imageelement) {
	var individualContentUrl = baseTenantAPIURL + '/' + contentService + '/' + updateContentId;

	$.ajax({
		xhrFields: {
			withCredentials: true
		},
		type: "GET",
		dataType: "json",
		url:individualContentUrl ,
		success: function (currentContentResult) {
			$(currentContentResult).each(function(currentItemIndex, currentContentItem) {

			var elements = JSON.parse(JSON.stringify(currentContentItem.elements));
			// Populate all the text fields in the elements
			Object.keys(contentElements).forEach(function(key) {
				elements[key].value = contentElements[key];
			});
			elements.image=imageelement.image;
			var data = {
				"elements": elements
			};
			currentContentItem.elements= elements;
			var putContentUrl = baseTenantAPIURL +'/'+contentService + '/'+currentContentItem.id;
			$.ajax({
						xhrFields: {
							withCredentials: true
						},
						type: "PUT",
						dataType: "json",
						data: JSON.stringify(currentContentItem),
						url: putContentUrl ,
						success: function (result) {
							$(result).each(function(index, item) {
								$("#sample-message").text("Success");
								return item;
							});
						},
						error: function () {
							console.log("Local error callback. - PUT request");
						},
					});
			});
		},
		error: function () {
			console.log("Local error callback. - get current content item request");
			$("#sample-message").text("Error - Make sure the content item exists and is in ready state for this sample.");
		},
    });
}
