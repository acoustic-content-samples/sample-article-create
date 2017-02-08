# sample-article-create
This is a sample of a custom web application for creating new "Article" content items with images in IBM Watson Content Hub (WCH).

This sample shows:
* Authenticating to the Watson Content Hub and calling APIs that require authentication.
* Using the authoring services for resources, assets, and content to upload a resource, create an asset, and create an "Article" content item that includes the image. 

This sample can be used to create new articles that will be displayed in this earlier sample: https://github.com/ibm-wch/sample-article-carousel

This screenshot shows the completed form for a new Article:
![Alt text](/docs/create-article-screenshot.jpg?raw=true "Sample screenshot")

###Running the sample

#### 1. Download the files

Download the application files (html, js, and css) from the 'public' folder into any folder on your workstation.

#### 2. Update the user credentials

This sample uses hard-coded user name and password set in the app.js file. Update the name and password values in that file.

To avoid putting credentials in the source you could change the application to provide browser inputs for username and password.

#### 3. Create the "Article" content type

This application uses an "Article" content type that must be created for your tenant prior to running the sample the first time. 

Follow the instructions at the [sample-article-content](https://github.com/ibm-wch/sample-article-content) repository, to download and push the sample article type and associated authoring artifacts, for your content hub tenant.

#### 4. Enable CORS support for your tenant

For this scenario you will need to enable CORS support for your tenant. To control the CORS enablement for Watson Content Hub, go to Hub set up -> General settings -> Security tab. After adding your domain (or "*" for any domain), be sure to click the Save button at the top right of the screen.

#### 5. Load index.html in a browser

You can do this right from the file system in Firefox, Chrome, or Safari browsers. Alternatively you can make the files available on any web server and open index.html in a browser using your web server URL.

###Implementation notes

####Specifying the content type when creating a content item

The API for creating a new content items requires the ID of a content type rather than the name of the content type. In this sample the ID of the "article" type is determined by doing a search for a content type of name "article". Alternatively, if you are working with a content type that you have defined, you can code the ID directly in your application. The ID is guaranteed not to change once a content type is created.

####Creating an image asset and referencing it in a content item
Creating a new image (or other file) asset in WCH is a two-step process: first the file is uploaded to the resources service, and then the returned ID for the resource is used to create an asset. In this sample the HTML5 File object is used with XMLHttpRequest to upload the file.

Once the image asset is created, the returned JSON can be used in building the element data that is used when creating a content item.

####Building the elements data for the new content item
In this example, there is a hard-coded "emptyElements" structure that matches the fields and element types that the Article content type expects.

####Using the helper functions for the steps in creating the content item
The individual API calls used in this example are broken out into separate reusable functions so that you could use them in different ways.

In this sample all of the following calls are used:
- Login, with wchLogin
- Upload resource, with wchCreateResource
- Create asset from resource ID, with wchCreateAssetFromResource
- Search for content type "article," with wchSearch
- Create content item, with wchCreateContentItem

If, for example, you just want to create a content item with only text fields using a known content type ID, you would just call:
- wchLogin
- wchCreateContentItem

And if you just want to upload a file and create a new asset you would call:
- wchLogin
- wchCreateResource
- wchCreateAssetFromResource


###Resources

API Explorer reference documentation: https://developer.ibm.com/api/view/id-618

Watson Content Hub developer center: https://developer.ibm.com/wch/

Watson Content Hub forum: https://developer.ibm.com/answers/smartspace/wch/

