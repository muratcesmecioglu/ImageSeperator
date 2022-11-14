# Image Seperator

This is my first Node.js application. With this application you can separate many pictures and videos in a folder into separate folders.

When you first run the program, a web server starts running on port 80. When you connect to http://localhost via browser, it redirects you to the settings page for select a folder.

It randomly brings up the images from the selected folder. When you click on the labels at the bottom, it moves the image to the folder of your choice and brings up a new image. If you want, you can delete the image by pressing the "Remove" button.

### Features
* When you add tag, app will create the tag's folder with the same name.. If you want to move subfolder, you can write tag name like this: sub/folder

### Installation
```
git clone https://github.com/muratcesmecioglu/ImageSeperator.git
cd ImageSeperator
npm install
node index.js
```
