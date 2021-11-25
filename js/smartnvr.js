
var refreshInterval = 15; /* milliseconds */
var framerateFactor = 1;
var username = '';
var passwordHash = '';
var signatureRegExp = new RegExp('[^a-zA-Z0-9/?_.=&{}\\[\\]":, _-]', 'g');
var pageContainer = null;
var layoutColumns = 1;
var fitFramesVertically = false;
var layoutRows = 1;
var refreshDisabled = false;
var resolutionFactor = 1;
var streaming_framerate = 5
var streaming_server_resize = false
var inProgress = false;
var fullScreenCameraId = null;

/* Object utilities */

Array.prototype.sortKey = function (keyFunc, reverse) {
    this.sort(function (e1, e2) {
        var k1 = keyFunc(e1);
        var k2 = keyFunc(e2);
        
        if ((k1 < k2 && !reverse) || (k1 > k2 && reverse)) {
            return -1;
        }
        else if ((k1 > k2 && !reverse) || (k1 < k2 && reverse)) {
            return 1;
        }
        else {
            return 0;
        }
    });
};

    /* misc utilities */

var sha1 = (function () {
    var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
    var P = Math.pow(2, 32);

    function hash(msg) {
        msg += String.fromCharCode(0x80);

        var l = msg.length / 4 + 2;
        var N = Math.ceil(l / 16);
        var M = new Array(N);

        for (var i = 0; i < N; i++) {
            M[i] = new Array(16);
            for (var j = 0; j < 16; j++) {
                M[i][j] = (msg.charCodeAt(i * 64 + j * 4) << 24) | (msg.charCodeAt(i * 64 + j * 4 + 1) << 16) | 
                (msg.charCodeAt(i * 64 + j * 4 + 2) << 8) | (msg.charCodeAt(i * 64 + j * 4 + 3));
            }
        }
        M[N - 1][14] = Math.floor(((msg.length - 1) * 8) / P);
        M[N - 1][15] = ((msg.length - 1) * 8) & 0xffffffff;

        var H0 = 0x67452301;
        var H1 = 0xefcdab89;
        var H2 = 0x98badcfe;
        var H3 = 0x10325476;
        var H4 = 0xc3d2e1f0;

        var W = new Array(80);
        var a, b, c, d, e;
        for (i = 0; i < N; i++) {
            for (var t = 0; t < 16; t++) W[t] = M[i][t];
            for (t = 16; t < 80; t++) W[t] = ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);

            a = H0; b = H1; c = H2; d = H3; e = H4;

            for (var t = 0; t < 80; t++) {
                var s = Math.floor(t / 20);
                var T = (ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t]) & 0xffffffff;
                e = d;
                d = c;
                c = ROTL(b, 30);
                b = a;
                a = T;
            }

            H0 = (H0 + a) & 0xffffffff;
            H1 = (H1 + b) & 0xffffffff; 
            H2 = (H2 + c) & 0xffffffff; 
            H3 = (H3 + d) & 0xffffffff; 
            H4 = (H4 + e) & 0xffffffff;
        }

        return toHexStr(H0) + toHexStr(H1) + toHexStr(H2) + toHexStr(H3) + toHexStr(H4);
    }

    function f(s, x, y, z)  {
        switch (s) {
            case 0: return (x & y) ^ (~x & z);
            case 1: return x ^ y ^ z;
            case 2: return (x & y) ^ (x & z) ^ (y & z);
            case 3: return x ^ y ^ z;
        }
    }

    function ROTL(x, n) {
        return (x << n) | (x >>> (32 - n));
    }

    function toHexStr(n) {
        var s = "", v;
        for (var i = 7; i >= 0; i--) {
            v = (n >>> (i * 4)) & 0xf;
            s += v.toString(16);
        }
        return s;
    }
    
    return hash;
}());

function ajax(method, url, ip_port, creation_date, data, callback, error, timeout) {
    var origUrl = url;
    var origData = data;

    if (url.indexOf('?') < 0) {
        url += '?';
    }
    else {
        url += '&';
    }

    url += '_=' + new Date().getTime();

    var json = false;
    var processData = true;
    if (method == 'POST') {
        if (window.FormData && (data instanceof FormData)) {
            json = false;
            processData = false;
        }
        else if (typeof data == 'object') {
            data = JSON.stringify(data);
            json = true;
        }
    }
    else { /* assuming GET */
        if (data) {
            var query = $.param(data);
            /* $.param encodes spaces as "+" */
            query = query.replaceAll('+', '%20');
            url += '&' + query;
            data = null;
        }
    }

    url = addAuthParams(method, url, processData ? data : null);

    function onResponse(data) {
        if (data && data.error == 'unauthorized') {
            if (data.prompt) {
                runLoginDialog(function () {
                    ajax(method, origUrl, origData, callback, error);
                });
            }

            window._loginRetry = true;
        }
        else {
            delete window._loginRetry;
            if (callback) {
                $('body').toggleClass('admin', true);
                callback(data);
            }
        }
    }
    url = ip_port+url
    var options = {
        type: method,
        url: "/mgnt/log/movie/list/smartnvr/",
        data: {url: url, date: creation_date},
        timeout: timeout || 300 * 1000,
        success: onResponse,
        contentType: json ? 'application/json' : false,
        processData: processData,
        error: error || function (request, options, error) {
            if (request.status == 403) {
                return onResponse(request.responseJSON);
            }
            console.log('error')

            //showErrorMessage();
            //if (callback) {
            //    callback();
            //}
        }
    };

    $.ajax(options);
}

function downloadFile(path, ip_port) {
    var basePath = "/"
    var url = basePath + path;
    url = addAuthParams('GET', url);
    url = ip_port + url

    /* download the file by creating a temporary iframe */
    var frame = $('<iframe style="display: none;"></iframe>');
    frame.attr('src', url);
    $('body').append(frame);
}

function runPictureDialog(entries, pos, mediaType, ip_port) {
    var basePath = "/"
    var content = $('<div class="picture-dialog-content"></div>');

    var img = $('<img class="picture-dialog-content">');
    content.append(img);

    var video_container = $('<video class="picture-dialog-content" controls="true">');
    var video_loader = $('<img>');
    video_container.on('error', function(err) {
        var msg = '';

        /* Reference: https://html.spec.whatwg.org/multipage/embedded-content.html#error-codes */
        switch (err.target.error.code) {
            case err.target.error.MEDIA_ERR_ABORTED:
                msg = 'You aborted the video playback.';
                break;
            case err.target.error.MEDIA_ERR_NETWORK:
                msg = 'A network error occurred.';
                break;
            case err.target.error.MEDIA_ERR_DECODE:
                msg = 'Media decode error or unsupported media features.';
                break;
            case err.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                msg = 'Media format unsupported or otherwise unavilable/unsuitable for playing.';
                break;
            default:
                msg = 'Unknown error occurred.'
        }

        showErrorMessage('Error: ' + msg);
    });
    video_container.hide();
    content.append(video_container);

    var prevArrow = $('<div class="picture-dialog-prev-arrow button mouse-effect" title="previous picture"></div>');
    content.append(prevArrow);

    var playButton = $('<div class="picture-dialog-play button mouse-effect" title="play"></div>');
    content.append(playButton);

    var nextArrow = $('<div class="picture-dialog-next-arrow button mouse-effect" title="next picture"></div>');
    content.append(nextArrow);
    var progressImg = $('<div class="picture-dialog-progress">');

    function updatePicture() {
        var entry = entries[pos];

        var windowWidth = $(window).width();
        var windowHeight = $(window).height();
        var widthCoef = windowWidth < 1000 ? 0.8 : 0.5;
        var heightCoef = 0.75;

        var width = parseInt(windowWidth * widthCoef);
        var height = parseInt(windowHeight * heightCoef);

        prevArrow.css('display', 'none');
        nextArrow.css('display', 'none');

        var playable = video_container.get(0).canPlayType(entry.mimeType) != ''
        playButton.hide();
        video_container.hide();
        img.show();

        img.parent().append(progressImg);
        updateModalDialogPosition();
        var url_img = ip_port + addAuthParams('GET', basePath + mediaType + '/' + entry.cameraId + '/preview' + entry.path)
        img.attr('src', url_img);

        if (playable) {
            video_loader.attr('src', addAuthParams('GET', basePath + mediaType + '/' + entry.cameraId + '/playback' + entry.path));
            playButton.on('click', function() {
                video_container.attr('src', addAuthParams('GET', basePath + mediaType + '/' + entry.cameraId + '/playback' + entry.path));
                video_container.show();
                video_container.get(0).load();  /* Must call load() after changing <video> source */
                img.hide();
                playButton.hide();
                video_container.on('canplay', function() {
                   video_container.get(0).play();  /* Automatically play the video once the browser is ready */
                });
            });

            playButton.show();
        }

        img.load(function () {
            var aspectRatio = this.naturalWidth / this.naturalHeight;
            var sizeWidth = width * width / aspectRatio;
            var sizeHeight = height * aspectRatio * height;

            img.width('').height('');
            video_container.width('').height('');

            if (sizeWidth < sizeHeight) {
                img.width(width);
                video_container.width(width).height(parseInt(width/aspectRatio));
            }
            else {
                img.height(height);
                video_container.width(parseInt(height*aspectRatio)).height(height);
            }
            updateModalDialogPosition();
            prevArrow.css('display', pos < entries.length - 1 ? '' : 'none');
            nextArrow.css('display', pos > 0 ? '' : 'none');
            progressImg.remove();
        });

        $('div.modal-container').find('span.modal-title:last').html(entry.name);
        updateModalDialogPosition();
    }

    prevArrow.click(function () {
        if (pos < entries.length - 1) {
            pos++;
        }

        updatePicture();
    });

    nextArrow.click(function () {
        if (pos > 0) {
            pos--;
        }

        updatePicture();
    });

    function bodyKeyDown(e) {
        switch (e.which) {
            case 37:
                if (prevArrow.is(':visible')) {
                    prevArrow.click();
                }
                break;

            case 39:
                if (nextArrow.is(':visible')) {
                    nextArrow.click();
                }
                break;
        }
    }

    $('body').on('keydown', bodyKeyDown);

    img.load(updateModalDialogPosition);

    runModalDialog({
        title: ' ',
        closeButton: true,
        buttons: [
            {caption: 'Close'},
            {caption: 'Download', isDefault: true, click: function () {
                var entry = entries[pos];
                downloadFile(mediaType + '/' + entry.cameraId + '/download' + entry.path, ip_port);

                return false;
            }}
        ],
        content: content,
        stack: true,
        onShow: updatePicture,
        onClose: function () {
            $('body').off('keydown', bodyKeyDown);
        }
    });
}

function runMediaDialog(cameraId, mediaType, ip_port, creation_date) {
    var basePath = "/"
    var dialogDiv = $('<div class="media-dialog"></div>');
    var mediaListDiv = $('<div class="media-dialog-list"></div>');
    var groupsDiv = $('<div class="media-dialog-groups"></div>');
    var buttonsDiv = $('<div class="media-dialog-buttons"></div>');

    var groups = {};
    var groupKey = null;

    dialogDiv.append(groupsDiv);
    dialogDiv.append(mediaListDiv);
    dialogDiv.append(buttonsDiv);

    /* add a temporary div to compute 3em in px */
    var tempDiv = $('<div style="width: 3em; height: 3em;"></div>');
    $('div.modal-container').append(tempDiv);
    var height = tempDiv.height();
    tempDiv.remove();

    function showGroup(key) {
        groupKey = key;

        if (mediaListDiv.find('img.media-list-progress').length) {
            return; /* already in progress of loading */
        }

        /* (re)set the current state of the group buttons */
        groupsDiv.find('div.media-dialog-group-button').each(function () {
            var $this = $(this);
            if (this.key == key) {
                $this.addClass('current');
            }
            else {
                $this.removeClass('current');
            }
        });

        var mediaListByName = {};
        var entries = groups[key];

        /* cleanup the media list */
        mediaListDiv.children('div.media-list-entry').detach();
        mediaListDiv.html('');

        function addEntries() {
            /* add the entries to the media list */
            entries.forEach(function (entry) {
                var entryDiv = entry.div;
                var detailsDiv = null;

                if (!entryDiv) {
                    entryDiv = $('<div class="media-list-entry"></div>');

                    var previewImg = $('<img class="media-list-preview" src="' + staticPath + 'img/modal-progress.gif"/>');
                    entryDiv.append(previewImg);
                    previewImg[0]._src = addAuthParams('GET', basePath + mediaType + '/' + cameraId + '/preview' + entry.path + '?height=' + height);
                    previewImg[0]._src = ip_port + previewImg[0]._src

                    var downloadButton = $('<div class="media-list-download-button button">Download</div>');
                    entryDiv.append(downloadButton);

                    //var deleteButton = $('<div class="media-list-delete-button button">Delete</div>');
                    //entryDiv.append(deleteButton);

                    var nameDiv = $('<div class="media-list-entry-name">' + entry.name + '</div>');
                    entryDiv.append(nameDiv);

                    detailsDiv = $('<div class="media-list-entry-details"></div>');
                    entryDiv.append(detailsDiv);

                    downloadButton.click(function () {
                        downloadFile(mediaType + '/' + cameraId + '/download' + entry.path, ip_port);
                        return false;
                    });

                    // deleteButton.click(function () {
                    //     doDeleteFile(basePath + mediaType + '/' + cameraId + '/delete' + entry.path, function () {
                    //         entryDiv.remove();
                    //         var pos = entries.indexOf(entry);
                    //         if (pos >= 0) {
                    //             entries.splice(pos, 1); /* remove entry from group */
                    //         }
                    //
                    //         /* update text on group button */
                    //         groupsDiv.find('div.media-dialog-group-button').each(function () {
                    //             var $this = $(this);
                    //             if (this.key == groupKey) {
                    //                 var text = this.innerHTML;
                    //                 text = text.substring(0, text.lastIndexOf(' '));
                    //                 text += ' (' + entries.length + ')';
                    //                 this.innerHTML = text;
                    //             }
                    //         });
                    //     });
                    //
                    //     return false;
                    // });

                    entryDiv.click(function () {
                        var pos = entries.indexOf(entry);
                        runPictureDialog(entries, pos, mediaType, ip_port);
                    });

                    entry.div = entryDiv;
                }
                else {
                    detailsDiv = entry.div.find('div.media-list-entry-details');
                }

                var momentSpan = $('<span class="details-moment">' + entry.momentStr + ', </span>');
                var momentShortSpan = $('<span class="details-moment-short">' + entry.momentStrShort + '</span>');
                var sizeSpan = $('<span class="details-size">' + entry.sizeStr + '</span>');
                detailsDiv.empty();
                detailsDiv.append(momentSpan);
                detailsDiv.append(momentShortSpan);
                detailsDiv.append(sizeSpan);
                mediaListDiv.append(entryDiv);
            });

            /* trigger a scroll event */
            mediaListDiv.scroll();
        }

        /* if details are already fetched, simply add the entries and return */
        if (entries[0].timestamp) {
            return addEntries();
        }

        var previewImg = $('<img class="media-list-progress" src="' + staticPath + 'img/modal-progress.gif"/>');
        mediaListDiv.append(previewImg);

        var url = basePath + mediaType + '/' + cameraId + '/list/?prefix=' + (key || 'ungrouped');
        ajax('GET', url, ip_port, creation_date, null, function (data) {
            previewImg.remove();

            if (data == null || data.error) {
                hideModalDialog();
                showErrorMessage(data && data.error);
                return;
            }

            /* index the media list by name */
            data.mediaList.forEach(function (media) {
                var path = media.path;
                var parts = path.split('/');
                var name = parts[parts.length - 1];

                mediaListByName[name] = media;
            });

            /* assign details to entries */
                entries.forEach(function (entry) {
                    var media = mediaListByName[entry.name];
                    if (media) {
                        entry.momentStr = media.momentStr;
                        entry.momentStrShort = media.momentStrShort;
                        entry.sizeStr = media.sizeStr;
                        entry.timestamp = media.timestamp;
                    }
                });

                /* sort the entries by timestamp */
            entries.sortKey(function (e) {return e.timestamp || e.name;}, true);

            addEntries();
        });
    }

    if (mediaType == 'picture') {
        var zippedButton = $('<div class="media-dialog-button">Zipped</div>');
        buttonsDiv.append(zippedButton);

        zippedButton.click(function () {
            if (groupKey != null) {
                doDownloadZipped(cameraId, groupKey);
            }
        });

        var timelapseButton = $('<div class="media-dialog-button">Timelapse</div>');
        buttonsDiv.append(timelapseButton);

        timelapseButton.click(function () {
            if (groupKey != null) {
                runTimelapseDialog(cameraId, groupKey, groups[groupKey]);
            }
        });
    }

    //var deleteAllButton = $('<div class="media-dialog-button media-dialog-delete-all-button">Delete All</div>');
    //buttonsDiv.append(deleteAllButton);

    // deleteAllButton.click(function () {
    //     if (groupKey != null) {
    //         doDeleteAllFiles(mediaType, cameraId, groupKey, function () {
    //             /* delete th group button */
    //             groupsDiv.find('div.media-dialog-group-button').each(function () {
    //                 var $this = $(this);
    //                 if (this.key == groupKey) {
    //                     $this.remove();
    //                 }
    //             });
    //
    //             /* delete the group itself */
    //             delete groups[groupKey];
    //
    //             /* show the first existing group, if any */
    //             var keys = Object.keys(groups);
    //             if (keys.length) {
    //                 showGroup(keys[0]);
    //             }
    //             else {
    //                 hideModalDialog();
    //             }
    //         });
    //     }
    // });

    function updateDialogSize() {
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();

        if (Object.keys(groups).length == 0) {
            groupsDiv.width('auto');
            groupsDiv.height('auto');
            groupsDiv.addClass('small-screen');
            mediaListDiv.width('auto');
            mediaListDiv.height('auto');
            buttonsDiv.hide();

            return;
        }

        buttonsDiv.show();

        if (windowWidth < 1000) {
            mediaListDiv.width(windowWidth - 30);
            mediaListDiv.height(windowHeight - 140);
            groupsDiv.width(windowWidth - 30);
            groupsDiv.height('');
            groupsDiv.addClass('small-screen');
        }
        else {
            mediaListDiv.width(parseInt(windowWidth * 0.7));
            mediaListDiv.height(parseInt(windowHeight * 0.7));
            groupsDiv.height(parseInt(windowHeight * 0.7));
            groupsDiv.width('');
            groupsDiv.removeClass('small-screen');
        }
    }

    function onResize() {
        updateDialogSize();
        updateModalDialogPosition();
    }

    $(window).resize(onResize);

    updateDialogSize();

    showModalDialog('<div class="modal-progress"></div>');

    /* fetch the media list */
    ajax('GET', basePath + mediaType + '/' + cameraId + '/list/', ip_port, creation_date, null, function (data) {
        if (data == null || data.error) {
            hideModalDialog();
            showErrorMessage(data && data.error);
            return;
        }

        /* group the media */
        data.mediaList.forEach(function (media) {
            var path = media.path;
            var parts = path.split('/');
            var keyParts = parts.splice(0, parts.length - 1);
            var key = keyParts.join('/');

            if (key.indexOf('/') === 0) {
                key = key.substring(1);
            }

            var list = (groups[key] = groups[key] || []);

            list.push({
                'path': path,
                'group': key,
                'name': parts[parts.length - 1],
                'cameraId': cameraId
            });
        });

        updateDialogSize();

        var keys = Object.keys(groups);
        keys.sort();
        keys.reverse();

        if (keys.length) {
            keys.forEach(function (key) {
                var groupButton = $('<div class="media-dialog-group-button"></div>');
                groupButton.text((key || '(ungrouped)') + ' (' + groups[key].length + ')');
                groupButton[0].key = key;

                groupButton.click(function () {
                    showGroup(key);
                });

                groupsDiv.append(groupButton);
            });

            /* add tooltips to larger group buttons */
            setTimeout(function () {
                groupsDiv.find('div.media-dialog-group-button').each(function () {
                    if (this.scrollWidth > this.offsetWidth) {
                        this.title = this.innerHTML;
                    }
                });
            }, 10);
        }
        else {
            groupsDiv.html('(Nenhuma gravação encontrada)');
            mediaListDiv.remove();
        }

        var title;
        if ($(window).width() < 1000) {
            title = data.cameraName;
        }
        else if (mediaType === 'picture') {
            title = 'Pictures taken by ' + data.cameraName;
        }
        else {
            title = 'Videos gravados por ' + data.cameraName;
        }

        runModalDialog({
            title: title,
            closeButton: true,
            buttons: '',
            content: dialogDiv,
            onShow: function () {
                //dialogDiv.scrollTop(dialogDiv.prop('scrollHeight'));
                if (keys.length) {
                    showGroup(keys[0]);
                }
            },
            onClose: function () {
                $(window).unbind('resize', onResize);
            }
        });
    });

    /* install the media list scroll event handler */
    mediaListDiv.scroll(function () {
        var height = mediaListDiv.height();

        mediaListDiv.find('img.media-list-preview').each(function () {
            if (!this._src) {
                return;
            }

            var $this = $(this);
            var entryDiv = $this.parent();

            var top1 = entryDiv.position().top;
            var top2 = top1 + entryDiv.height();

            if ((top1 >= 0 && top1 <= height) ||
                (top2 >= 0 && top2 <= height)) {

                this.src = this._src;
                delete this._src;
            }
        });
    });
}

function splitUrl(url) {
    if (!url) {
        url = window.location.href;
    }
    
    var parts = url.split('?');
    if (parts.length < 2 || parts[1].length === 0) {
        return {baseUrl: parts[0], params: {}};
    }
    
    var baseUrl = parts[0];
    var paramStr = parts[1];
    
    parts = paramStr.split('&');
    var params = {};
    
    for (var i = 0; i < parts.length; i++) {
        var pair = parts[i].split('=');
        params[pair[0]] = pair[1];
    }
    
    return {baseUrl: baseUrl, params: params};
}

function qualifyUrl(url) {
    var a = document.createElement('a');    
    a.href = url;
    return a.href;
}

function qualifyPath(path) {
    var url = qualifyUrl(path);
    var pos = url.indexOf('//');
    if (pos === -1) { /* not a full url */
        return url;
    }
    
    url = url.substring(pos + 2);
    pos = url.indexOf('/');
    if (pos === -1) { /* root with no trailing slash */
        return '';
    }
    
    return url.substring(pos);
}
        
function computeSignature(method, path, body) {
    path = qualifyPath(path);    
    
    var parts = splitUrl(path);
    var query = parts.params;
    path = parts.baseUrl;    

    path = '/' + path.substring(1);
    
    /* sort query arguments alphabetically */
    query = Object.keys(query).map(function (key) {return {key: key, value: decodeURIComponent(query[key])};});
    query = query.filter(function (q) {return q.key !== '_signature';});
    query.sortKey(function (q) {return q.key;});
    query = query.map(function (q) {return q.key + '=' + encodeURIComponent(q.value);}).join('&');
    path = path + '?' + query;
    path = path.replace(signatureRegExp, '-');
    body = body && body.replace(signatureRegExp, '-');
    
    return sha1(method + ':' + path + ':' + (body || '') + ':' + passwordHash).toLowerCase();
}

function addAuthParams(method, url, body) {
    if (!window.username) {
        return url;
    }

    if (url.indexOf('?') < 0) {
        url += '?';
    }
    else {
        url += '&';
    }
    
    url += '_username=' + window.username;
    if (window._loginDialogSubmitted) {
        url += '&_login=true';
        window._loginDialogSubmitted = false;
    }    
    var signature = computeSignature(method, url, body);

    url += '&_signature=' + signature;

    return url;
}

function getCookie(name) {
    var cookie = document.cookie + '';
    if (cookie.length <= 0) {
        return null;
    }

    var start = cookie.indexOf(name + '=');
    if (start == -1) {
        return null;
    }
     
    var start = start + name.length + 1;
    var end = cookie.indexOf(';', start);
    if (end == -1) {
        end = cookie.length;
    }

    return cookie.substring(start, end);
}

function setCookie(name, value, days) {
    var date, expires;
    if (days) {
        date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = 'expires=' + date.toGMTString();
    }
    else {
        expires = '';
    }

    document.cookie = name + '=' + value + '; ' + expires + '; path=/';
}

function getPageContainer() {
    if (!pageContainer) {
        pageContainer = $('div.page-container');
    }
    
    return pageContainer; 
}

function getCameraFrames() {
    return getPageContainer().children('div.div-cam');
}

function getCameraFramesPopup() {
    return $('.popupCam').not('.hide').find('div.camera-frame');
}

function updateLayout() {
    if (fitFramesVertically) {
        /* make sure the height of each camera
         * is smaller than the height of the screen
         * divided by the number of layout rows */
        
        /* find the tallest frame */
        var frames = getCameraFrames();
        var maxHeight = -1;
        var maxHeightFrame = null;
        frames.each(function () {
            var frame = $(this);
            var height = frame.height();
            if (height > maxHeight) {
                maxHeight = height;
                maxHeightFrame = frame;
            }
        });
        
        if (!maxHeightFrame) {
            return; /* no camera frames */
        }
        
        var pageContainer = getPageContainer();
        var windowWidth = $(window).width();
        
        var columns = layoutColumns;
        if (isFullScreen() || windowWidth <= 1200) {
            columns = 1; /* always 1 column when in full screen or mobile */
        }
        
        var heightOffset = 10; /* some padding */
        if (!isFullScreen()) {
            heightOffset += 50; /* top bar */
        }
    
        var windowHeight = $(window).height() - heightOffset;
        var ratio = maxHeightFrame.width() / maxHeightFrame.height() / layoutRows;
        var width = parseInt(ratio * windowHeight * columns);
        var maxWidth = windowWidth;
        
        if (pageContainer.hasClass('stretched') && windowWidth > 1200) {
            maxWidth *= 0.6; /* opened settings panel occupies 40% of the window width */ 
        }
        
        if (width < 100) {
            width = 100; /* absolute minimum width for a frame */
        }
        
        if (width > maxWidth) {
            getPageContainer().css('width', '');
            return; /* page container width already at its maximum */
        }
        
        getPageContainer().css('width', width);
    }
    else {
        getPageContainer().css('width', '');
    }
}



function checkCameraErrors() {
    /* properly triggers the onerror event on the cameras whose imgs were not successfully loaded,
     * but the onerror event hasn't been triggered, for some reason (seems to happen in Chrome) */
    var cameraImgs = getPageContainer().find('img.camera');
    var now = new Date().getTime();

    cameraImgs.each(function () {
        if (this.complete === true && this.naturalWidth === 0 && !this.error && this.src) {
            $(this).error();
        }
    });

    setTimeout(checkCameraErrors, 1000);
}

/* camera frame */
function addCameraFrameUi(cameraId, url, system, id_merge, name_equip, name_split, sensor_split, datetime_equip, equipment_id, branch_id, high_priority) {
    var item = id_merge.split('_')[1]
    var cameraFrameDiv = $(
        '<div class="col-md-2 div-cam div_grid div_grid_' + system + '_'+ equipment_id +'" data-equipment="' + system + '_' + equipment_id + '" data-alert="' + system + '_' + id_merge + '" url="' + url + '">' +
            '<div class="div_cam_title" title="' + name_equip + '">' + 
                '<div data-branch="' + branch_id +'" title="Informações da Agência" class="popup-info"><i style="color: white;cursor:pointer" class="fas fa-info-circle"></i></div>' +
                '<div class="info_title">'+ name_split + '<br>' + datetime_equip +'</div>'+ 
                '<div title="Reconhecer todos sensores" class="recognize-all"><i style="color: white" class="fas fa-thumbtack"></i></div>' +
            '</div>' +
            '<div class="camera-frame">' +
                '<div class="camera-container">' +
                    '<div class="camera-placeholder"><img class="no-camera" src="' + staticPath + 'img/no-camera.svg"></div>' +
                    '<img id="img_grid_' + system + '_' + id_merge + '" class="camera camera-hvr width-img img_zoom">' +
                    '<div class="camera-progress"><img class="camera-progress"></div>' +
                '</div>' +
            '</div>' +
            '<div class="select_sensor">'+
                '<div class="sensor_title sensor_' + item + '" data-sensor-alert="'+ system + '_' + id_merge +'" title = "'+sensor_split+'" >' + sensor_split + '</div>' +
            '</div>'+
        '</div>');

    var cameraPlaceholder = cameraFrameDiv.find('div.camera-placeholder');
    var cameraProgress = cameraFrameDiv.find('div.camera-progress');
    var cameraImg = cameraFrameDiv.find('img.camera');
    var progressImg = cameraFrameDiv.find('img.camera-progress');
    var popupInfo = cameraFrameDiv.find('div.popup-info');

    cameraFrameDiv.attr('id', 'camera' + cameraId + "_" + id_merge);
    cameraFrameDiv[0].refreshDivider = 0;
    progressImg.attr('src', staticPath + 'img/camera-progress.gif');

    cameraProgress.addClass('visible');
    cameraPlaceholder.css('opacity', '0');

    /* insert the new camera frame at the right position,
     * with respect to the camera id */
    //var cameraFrames = getPageContainer().find('div.div-cam');
    //var cameraIds = cameraFrames.map(function () {return parseInt(this.id.substring(6));});
    //cameraIds.sort();

    //var index = 0; /* find the first position that is greater than the current camera id */
    //while (index < cameraIds.length && cameraIds[index] < cameraId) {
    //    index++;
    //}

    //if (index < cameraIds.length) {
    //    var beforeCameraFrame = getPageContainer().find('div.div-cam#camera' + cameraIds[index]);
    //    cameraFrameDiv.insertAfter(beforeCameraFrame);
    //}
    //else  {
    if (high_priority){
        getPageContainer().prepend(cameraFrameDiv);
        cameraFrameDiv.find('.select_sensor').children('.sensor_title').addClass("title_blink");
    } else{
        getPageContainer().append(cameraFrameDiv);
    }

    //}

    /* fade in */
    cameraFrameDiv.children('div.camera-frame').animate({'opacity': 1}, 100);

    var FPS_LEN = 4;
    cameraImg[0].fpsTimes = [];

    //função pisca-pisca
    /*function blink_text() {
        $('.title_blink').fadeOut(1200);
        $('.title_blink').fadeIn(800);
    }
    setInterval(blink_text, 1000);*/

    var recognize = $(
        '<div class="recognize_sensor well-margin">'+
                '<div class="flex-recognize">' + 
                    '<div class="title_recognize_sensor text-center"></div>'+
                    '<div type="button" class="close auth close-recognizex" aria-hidden="true">'+
                        '<i class="fas fa-times"></i>'+
                    '</div>'+
                '</div>'+
                '<textarea type="text" name="note_alert" value="" class="form-control val_select"></textarea>'+
                '<select class="change_select select-recognizr">'+
                  '<option id="empty_value" value="" >NENHUM VALOR SELECIONADO..</option>'+
                  '<option value="OCORRÊNCIA EM ANDAMENTO NO LOCAL">OCORRÊNCIA EM ANDAMENTO NO LOCAL</option>'+
                  '<option value="CONTATO NO LOCAL SEM EXITO">CONTATO NO LOCAL SEM EXITO</option>'+
                  '<option value="SOLICITADO RESGATE DE IMAGENS">SOLICITADO RESGATE DE IMAGENS</option>'+
                  '<option value="ACIONADO RONDA/PRONTA RESPOSTA">ACIONADO RONDA/PRONTA RESPOSTA</option>'+
                  '<option value="TÉCNICO NO LOCAL">TÉCNICO NO LOCAL</option>'+
                  '<option value="LOCAL EM OBRAS">LOCAL EM OBRAS</option>'+
                  '<option value="TELEVIGILANCIA SEM ANORMALIDADES">TELEVIGILANCIA SEM ANORMALIDADES</option>'+
                  '<option value="VIGILANTE IMPLANTADO NO LOCAL">VIGILANTE IMPLANTADO NO LOCAL</option>'+
                  '<option value="ACIONADO POLICIA MILITAR PARA O LOCAL">ACIONADO POLICIA MILITAR PARA O LOCAL</option>'+
                  '<option value="TESTE PÂNICO OK">TESTE PÂNICO OK</option>'+
                  '<option value="DISPAROS CONSTANTES - ALARME COM DEFEITO">DISPAROS CONSTANTES - ALARME COM DEFEITO</option>'+
                  '<option value="ERRO PROCEDIMENTO USUÁRIO - INTRUSÃO">ERRO PROCEDIMENTO USUÁRIO - INTRUSÃO</option>'+
                  '<option value="ERRO PROCEDIMENTO USUARIO-PÂNICO">ERRO PROCEDIMENTO USUARIO-PÂNICO</option>'+
                  '<option value="ERRO PROCEDIMENTO VIGILANTE-PÂNICO">ERRO PROCEDIMENTO VIGILANTE-PÂNICO</option>'+
                  '<option value="ERRO PROCEDIMENTO VIGILANTE - INTRUSÃO">ERRO PROCEDIMENTO VIGILANTE - INTRUSÃO</option>'+
                  '<option value="TESTE POLICIA FEDERAL – APROVADO (AP)">TESTE POLICIA FEDERAL – APROVADO (AP)</option>'+
                  '<option value="TESTE POLICIA FEDERAL- REPROVADO (RP)">TESTE POLICIA FEDERAL- REPROVADO (RP)</option>'+
                  '<option value="AGUARDANDO RETORNO DE RONDA/PRONTA RESPOSTA">AGUARDANDO RETORNO DE RONDA/PRONTA RESPOSTA</option>'+
                  '<option value="TESTE DE ALARME">TESTE DE ALARME</option>'+
                '</select>'+
                '<button type="button" class="btn btn-primary btn-lg btn-block btnAuthorize">Reconhecer</button>'+
        '</div>').draggable();

    var btn_recognize = recognize.find('button.btnAuthorize');
    var title_recognize_sensor = recognize.find('div.title_recognize_sensor');
    title_recognize_sensor.html(name_split + '<br>' + 'Reconhecer todos os sensores');

    var sensor_recognized = cameraFrameDiv.find('.recognize-all')

    sensor_recognized.on('click', function() {
        title_recognize_sensor.attr('title', name_equip)
        $("#formAuth").append(recognize);

        var change_select = recognize.find('.change_select')
        $(change_select).on('change', function() {
            var value_change  = $(this).val();
            var textarea = recognize.find('.val_select');
            textarea.append(value_change+'  ');
        });

        var popup_recognize = recognize.find('.close-recognizex');

        popup_recognize.on('click', function (e) {
            var form = $(this).parent().parent()
            form.find('.val_select').empty('').text('');
            form.find('#empty_value').removeAttr('selected')
            form.find('#empty_value').attr('selected', true);
            recognize.remove();
        });

        recognize.draggable();

        btn_recognize.on('click', function() {
            var sensor = cameraFrameDiv.find('.select_sensor').children('.sensor_title');
                sensor.each(function(index){
                    var recognize_date = $(this).attr('data-sensor-alert')
                    var lista = [recognize_date]
                    var system = recognize_date.split('_')[0];
                    var alert_id = recognize_date.split('_')[1];
                    var note_alert = recognize.find('.val_select').val().toUpperCase();
                    var id_merge = alert_id + "_" + note_alert
                    recognizeEvent(equipment_id, sensor, system, alert_id, note_alert, recognize ,lista);
                })
        });
    });

    // var change_select = recognize.find('.change_select')
    // $(change_select).on('change', function() {
    //     var value_change  = $(this).val();
    //     var select_value = recognize.find('.val_select')
    //     var textarea = recognize.find('.val_select')
    //     textarea.val(value_change)
    //     select_value.text(value_change);
    // });

    var popup_info = $(
        '<div class="popup_info card">'+
          '<div class="card-body">'+
            '<div class="card-title card-center">'+
                '<div class="obs">Informações da Agência</div>'+
                    '<div type="button" class="close auth info-auth" aria-hidden="true">'+
                    '<i class="fas fa-times"></i>'+
                '</div>'+
            '</div>'+
            '<div class="card-flex">'+
            '</div>'+
          '</div>'+
        '</div>').draggable();

    var popup_info_click = cameraFrameDiv.find('.popup-info')

    popup_info_click.on('click', function() {
        var popup_close_info = popup_info.find('.close.auth.info-auth');

        popup_close_info.on('click', function (e) {
            popup_info.remove();
        });

        popup_info.draggable();

        var branch_id = $(this).attr('data-branch')

        getInfoBranch(popup_info, branch_id)
    });



    /* error and load handlers */
    cameraImg[0].onerror = function () {
        this.error = true;
        this.loading = 0;

        cameraImg.addClass('error').removeClass('initializing');
        cameraImg.height(Math.round(cameraImg.width() * 0.75));
        cameraPlaceholder.css('opacity', 1);
        cameraProgress.removeClass('visible');
        cameraFrameDiv.removeClass('motion-detected');
    };
    cameraImg[0].onload = function () {
        if (this.error) {
            cameraImg.removeClass('error');
            cameraPlaceholder.css('opacity', 0);
            cameraImg.css('height', '');
            this.error = false;
        }

        this.loading = 0;
        if (this.naturalWidth) {
            this._naturalWidth = this.naturalWidth;
        }
        if (this.naturalHeight) {
            this._naturalHeight = this.naturalHeight;
        }

        if (this.initializing) {
            cameraProgress.removeClass('visible');
            cameraImg.removeClass('initializing');
            cameraImg.css('height', '');
            this.initializing = false;

            updateLayout();
        }

        /* there's no point in looking for a cookie update more often than once every second */
        var now = new Date().getTime();
        // if ((!this.lastCookieTime || now - this.lastCookieTime > 1000)) {
        //     if (getCookie('motion_detected_' + cameraId) == 'true') {
        //         cameraFrameDiv.addClass('motion-detected');
        //     }
        //     else {
        //         cameraFrameDiv.removeClass('motion-detected');
        //     }
        //
        //     //var captureFps = getCookie('capture_fps_' + cameraId);
        //     //var monitorInfo = getCookie('monitor_info_' + cameraId);
        //
        //     this.lastCookieTime = now;
        // }

        this.fpsTimes.push(now);
        while (this.fpsTimes.length > FPS_LEN) {
            this.fpsTimes.shift();
        }
    };

    cameraImg.addClass('initializing');
    cameraImg[0].initializing = true;
    cameraImg.height(Math.round(cameraImg.width() * 0.75));

}

/* camera frame */
function addCameraHvr(cameraId, url, system, id_merge, name_header){

    url_port = url.slice(0,-1)

    var cameraFrameDiv = $(
        '<div class="col-md-2 div-cam div_grid" url="' + url + '">' +
            '<div class="div_cam_title">' +
                '<div class="info_title">'+ name_header + '</div>'+
            '</div>' +
            '<div class="camera-frame">' +
                '<div class="camera-container">' +
                '<div class="camera-overlay">' +
                    '<div class="camera-overlay-top">' +
                        '<div class="camera-name"><span class="camera-name"></span></div>' +
                        '<div class="camera-top-buttons">' +
                            // '<div class="button icon camera-top-button mouse-effect full-screen" title="expandir tela"></div>' +
                            // '<div class="button icon camera-top-button mouse-effect media-pictures" title="salvar tela"></div>' +
                            '<div onclick="runMediaDialog('+cameraId+',\'movie\',\''+url_port+'\',false)" class="button icon camera-top-button mouse-effect media-movies" title="Gravaçôes"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="camera-overlay-mask"></div>' +
                '</div>' +
                    '<div class="camera-placeholder"><img class="no-camera" src="' + staticPath + 'img/no-camera.svg"></div>' +
                    '<img id="img_grid_' + system + '_' + id_merge + '" class="camera camera-hvr width-img img_zoom">' +
                    '<div class="camera-progress"><img class="camera-progress"></div>' +
                '</div>' +
            '</div>' +
        '</div>');

    var cameraPlaceholder = cameraFrameDiv.find('div.camera-placeholder');
    var cameraProgress = cameraFrameDiv.find('div.camera-progress');
    var cameraImg = cameraFrameDiv.find('img.camera');
    var progressImg = cameraFrameDiv.find('img.camera-progress');

    cameraFrameDiv.attr('id', 'camera' + cameraId + "_" + id_merge);
    cameraFrameDiv[0].refreshDivider = 0;
    progressImg.attr('src', staticPath + 'img/camera-progress.gif');

    cameraProgress.addClass('visible');
    cameraPlaceholder.css('opacity', '0');

    getPageContainer().append(cameraFrameDiv);

    /* fade in */
    cameraFrameDiv.children('div.camera-frame').animate({'opacity': 1}, 100);

    var FPS_LEN = 4;
    cameraImg[0].fpsTimes = [];

    /* error and load handlers */
    cameraImg[0].onerror = function () {
        this.error = true;
        this.loading = 0;

        cameraImg.addClass('error').removeClass('initializing');
        cameraImg.height(Math.round(cameraImg.width() * 0.75));
        cameraPlaceholder.css('opacity', 1);
        cameraProgress.removeClass('visible');
        cameraFrameDiv.removeClass('motion-detected');
    };
    cameraImg[0].onload = function () {
        if (this.error) {
            cameraImg.removeClass('error');
            cameraPlaceholder.css('opacity', 0);
            cameraImg.css('height', '');
            this.error = false;
        }

        this.loading = 0;
        if (this.naturalWidth) {
            this._naturalWidth = this.naturalWidth;
        }
        if (this.naturalHeight) {
            this._naturalHeight = this.naturalHeight;
        }

        if (this.initializing) {
            cameraProgress.removeClass('visible');
            cameraImg.removeClass('initializing');
            cameraImg.css('height', '');
            this.initializing = false;

            updateLayout();
        }

        /* there's no point in looking for a cookie update more often than once every second */
        var now = new Date().getTime();
        // if ((!this.lastCookieTime || now - this.lastCookieTime > 1000)) {
        //     if (getCookie('motion_detected_' + cameraId) == 'true') {
        //         cameraFrameDiv.addClass('motion-detected');
        //     }
        //     else {
        //         cameraFrameDiv.removeClass('motion-detected');
        //     }
        //
        //     //var captureFps = getCookie('capture_fps_' + cameraId);
        //     //var monitorInfo = getCookie('monitor_info_' + cameraId);
        //
        //     this.lastCookieTime = now;
        // }

        this.fpsTimes.push(now);
        while (this.fpsTimes.length > FPS_LEN) {
            this.fpsTimes.shift();
        }
    };

    function enableMaskEdit(cameraId, width, height) {
        var cameraFrame = getCameraFrame(cameraId);
        var overlayDiv = cameraFrame.find('div.camera-overlay');
        var maskDiv = cameraFrame.find('div.camera-overlay-mask');

        if (overlayDiv.hasClass('mask-edit')) {
            return; /* already enabled */
        }

        overlayDiv.addClass('mask-edit');

        var nx = maskWidth; /* number of rectangles */
        var rx, rw;
        if (width % nx) {
            nx--;
            rx = width % nx; /* remainder */
        }
        else {
            rx = 0;
        }
        
        rw = parseInt(width / nx); /* rectangle width */

        var maskHeight;
        var ny = maskHeight = parseInt(height * maskWidth / width); /* number of rectangles */
        var ry, rh;
        if (height % ny) {
            ny--;
            ry = height % ny; /* remainder */
        }
        else {
            ry = 0;
        }
        
        rh = parseInt(height / ny); /* rectangle height */
        
        var mouseDown = false;
        var currentState = false;
        var elementsMatrix = Array.apply(null, Array(maskHeight)).map(function(){return []});

        function matrixToMaskLines() {
            var maskLines = [];
            var bits, line;
            
            maskLines.push(width);
            maskLines.push(height);

            for (y = 0; y < ny; y++) {
                bits = [];
                for (x = 0; x < nx; x++) { 
                    bits.push(elementsMatrix[y][x].hasClass('on'));
                }

                if (rx) {
                    bits.push(elementsMatrix[y][nx].hasClass('on'));
                }
            
                line = 0;
                bits.forEach(function (bit, i) {
                    if (bit) {
                        line |= 1 << (maskWidth - 1 - i);
                    }
                });
            
                maskLines.push(line);
            }

            if (ry) {
                bits = [];
                for (x = 0; x < nx; x++) {
                    bits.push(elementsMatrix[ny][x].hasClass('on'));
                }

                if (rx) {
                    bits.push(elementsMatrix[ny][nx].hasClass('on'));
                }

                line = 0;
                bits.forEach(function (bit, i) {
                    if (bit) {
                        line |= 1 << (maskWidth - 1 - i);
                    }
                });

                maskLines.push(line);
            }
            
            $('#maskLinesEntry').val(maskLines.join(',')).change();
        }
        
        function handleMouseUp() {
            mouseDown = false;
            $('html').unbind('mouseup', handleMouseUp);
            matrixToMaskLines();
        }
        
        function makeMaskElement(x, y, px, py, pw, ph) {
            px = px * 100 / width;
            py = py * 100 / height;
            pw = pw * 100 / width;
            ph = ph * 100 / height;

            var el = $('<div class="mask-element"></div>');
            el.css('left', px + '%');
            el.css('top', py + '%');
            el.css('width', pw + '%');
            el.css('height', ph + '%');
            if (x == maskWidth - 1) {
                el.addClass('last-row');
            }
            if (y == maskHeight - 1) {
                el.addClass('last-line');
            }
            maskDiv.append(el);
            
            elementsMatrix[y][x] = el; 

            el.mousedown(function () {
                mouseDown = true;
                el.toggleClass('on');
                currentState = el.hasClass('on');
                $('html').mouseup(handleMouseUp);
            });
            
            el.mouseenter(function () {
                if (!mouseDown) {
                    return;
                }
                
                el.toggleClass('on', currentState);
            });
        }
        
        maskDiv[0]._matrixToMaskLines = matrixToMaskLines;

        /* make sure the mask is empty */
        maskDiv.html('');
        
        /* prevent editor closing by accidental click on mask container */
        maskDiv.click(function () {
            return false;
        });

        var x, y;
        for (y = 0; y < ny; y++) {
            for (x = 0; x < nx; x++) {
                makeMaskElement(x, y, x * rw, y * rh, rw, rh);
            }

            if (rx) {
                makeMaskElement(nx, y, nx * rw, y * rh, rx, rh);
            }
        }

        if (ry) {
            for (x = 0; x < nx; x++) {
                makeMaskElement(x, ny, x * rw, ny * rh, rw, ry);
            }

            if (rx) {
                makeMaskElement(nx, ny, nx * rw, ny * rh, rx, ry);
            }
        }
        
        /* use mask lines to initialize the element matrix */
        var line;
        var maskLines = $('#maskLinesEntry').val() ? $('#maskLinesEntry').val().split(',').map(function (v) {return parseInt(v);}) : [];
        maskLines = maskLines.slice(2);

        for (y = 0; y < ny; y++) {
            line = maskLines[y];
            for (x = 0; x < nx; x++) { 
                if (line & (1 << (maskWidth - 1 - x))) {
                    elementsMatrix[y][x].addClass('on');
                }
            }
            if (rx && (line & 1)) {
                elementsMatrix[y][nx].addClass('on');
            }
        }

        if (ry) {
            line = maskLines[ny];
            for (x = 0; x < nx; x++) {
                if (line & (1 << (maskWidth - 1 - x))) {
                    elementsMatrix[ny][x].addClass('on');
                }
            }

            if (rx && (line & 1)) {
                elementsMatrix[ny][nx].addClass('on');
            }
        }

        var selectedCameraId = $('#cameraSelect').val();
        if (selectedCameraId && (!cameraId || cameraId == selectedCameraId)) {
            $('#saveMaskButton, #clearMaskButton').css('display', 'inline-block');
            $('#editMaskButton').css('display', 'none');
        }
        
        if (!overlayVisible) {
            showCameraOverlay();
        }
    }

    function disableMaskEdit(cameraId) {
        var cameraFrames;
        if (cameraId) {
            cameraFrames = [getCameraFrame(cameraId)];
        }
        else { /* disable mask editor on any camera */
            cameraFrames = getCameraFrames().toArray().map(function (f) {return $(f);});
        }

        cameraFrames.forEach(function (cameraFrame) {
            var overlayDiv = cameraFrame.find('div.camera-overlay');
            var maskDiv = cameraFrame.find('div.camera-overlay-mask');

            overlayDiv.removeClass('mask-edit');
            maskDiv.html('');
            maskDiv.unbind('click');
        });
        
        var selectedCameraId = $('#cameraSelect').val();
        if (selectedCameraId && (!cameraId || cameraId == selectedCameraId)) {
            $('#editMaskButton').css('display', 'inline-block');
            $('#saveMaskButton, #clearMaskButton').css('display', 'none');
        }
    }

    function clearMask(cameraId) {
        var cameraFrame = getCameraFrame(cameraId);
        var maskDiv = cameraFrame.find('div.camera-overlay-mask');

        maskDiv.find('div.mask-element').removeClass('on');
        maskDiv[0]._matrixToMaskLines();
    }

    //variavel do fullscreen
    var fullScreenButton = cameraFrameDiv.find('div.camera-top-button.full-screen');

    var cameraOverlay = cameraFrameDiv.find('div.camera-overlay');

    //clique que retorna a função click para exibir o overlay-top
    cameraImg.click(function () {
        showCameraOverlay();
    });
    
    //clique que retorna a função click para esconder o overlay-top
    cameraImg.click(function () {
        hideCameraOverlay();
    });
        
    //find que encontra a class que está na respectiva div.
    cameraOverlay.find('div.camera-overlay-top').click(function () {
        return false;
    });


    //função que exibe o overlay-top do menu da camera.
    function showCameraOverlay() {
        getCameraFrames().find('div.camera-overlay').css('display', '');
        setTimeout(function () {
            getCameraFrames().find('div.camera-overlay').addClass('visible');
        }, 5);
        
        overlayVisible = true;
    }

    //função que esconde o overlay-top do menu da camera.
    function hideCameraOverlay() {
        getCameraFrames().find('div.camera-overlay').removeClass('visible');
        setTimeout(function () {
            getCameraFrames().find('div.camera-overlay').css('display', 'none');
        }, 5000);
        
        overlayVisible = false;

        //disableMaskEdit();
    }

    //funcção de cliq que retorna as funçoes show e exit do fullscreen
    fullScreenButton.click(function(id_merge) {
        return function() {
            if (fullScreenCameraId && fullScreenCameraId == id_merge) {
                doExitFullScreenCamera();
            } else {
                doFullScreenCamera(id_merge);
            }
        };
    }(id_merge));

    //função q gera um map para cada novo id.
    function getCameraIds() {
        return getCameraFrames().map(function () {
            return this.cameraId;
        }).toArray();
    }


    function getCameraFrame(cameraId) {
        var frame = getPageContainer().children('div.camera-frame#camera' + cameraId);
        if (!frame.length) {
            /* look for camera frames detached from page container */
            frame = $('div.camera-frame#camera' + cameraId);
        }
        
        return frame;
    }

    function getCameraProgresses() {
        return getCameraFrames().find('div.camera-progress'); 
    }
    
    //função que abre o modo fullscreen
    function doFullScreenCamera(cameraId) {
        if (inProgress) {
            return;
        }
        
        if (fullScreenCameraId != null) {
            return; /* a camera is already in full screen */
        }
        
        fullScreenCameraId = cameraId;
        
        var cameraIds = getCameraIds();
        cameraIds.forEach(function (cid) {
            if (cid == cameraId) {
                return;
            }
            
            refreshDisabled[cid] |= 0;
            refreshDisabled[cid]++;
            
            var cf = getCameraFrame(cid);
            cf.css('height', cf.height()); /* required for the height animation */
            setTimeout(function () {
                cf.addClass('full-screen-hidden');
            }, 10);
        });
        
        var cameraFrame = getCameraFrame(cameraId);
        var pageContainer = getPageContainer();
        
        pageContainer.addClass('full-screen');
        cameraFrame.addClass('full-screen');
        $('div.header').addClass('full-screen');
        $('div.footer').addClass('full-screen');
        
        /* try to make browser window full screen */
        var element = document.documentElement;
        var requestFullScreen = (
                element.requestFullscreen ||
                element.requestFullScreen ||
                element.webkitRequestFullscreen ||
                element.webkitRequestFullScreen ||
                element.mozRequestFullscreen ||
                element.mozRequestFullScreen ||
                element.msRequestFullscreen ||
                element.msRequestFullScreen);
        

        //se a requisição for de fullscreen ira atribuir o ID da camera e adicionar as seguintes classes.
        if (requestFullScreen) {
            element = $("#camera1_22_37").children(".camera-frame")[0];
            $('div.camera-container').addClass('smartnvr-camera-container');
            $('div.camera-overlay-top').addClass('smartnvr-camera-overlay-top');
            requestFullScreen.call(element);
        }

        /*if($('div.camera-container').hasClass('smartnvr-camera-container')){
            $(document).keyup(function(e) {
                 if (e.keyCode == 27) {
                    $('div.camera-container').removeClass('smartnvr-camera-container');
                    $('div.camera-overlay-top').removeClass('smartnvr-camera-overlay-top');
                }
            });
        }*/


        /* calling updateLayout like this fixes wrong frame size
         * after the window as actually been put into full screen mode */
        updateLayout();
        setTimeout(updateLayout, 200);
        setTimeout(updateLayout, 400);
        setTimeout(updateLayout, 1000);
    }

    //função que sai do modo fullscreen quando clicado no mesmo icone.
    function doExitFullScreenCamera() {
        if (fullScreenCameraId == null) {
            return; /* no current full-screen camera */
        }

        getCameraFrames().
                removeClass('full-screen-hidden').
                css('height', '');
        
        var cameraFrame = getCameraFrame(fullScreenCameraId);
        var pageContainer = getPageContainer();
        
        $('div.header').removeClass('full-screen');
        $('div.footer').removeClass('full-screen');
        pageContainer.removeClass('full-screen');
        cameraFrame.removeClass('full-screen');

        var cameraIds = getCameraIds();
        cameraIds.forEach(function (cid) {
            if (cid == fullScreenCameraId) {
                return;
            }
            
            refreshDisabled[cid]--;
        });

        fullScreenCameraId = null;
        
        updateLayout();

        /* exit browser window full screen */
        var exitFullScreen = (
                document.exitFullscreen ||
                document.cancelFullScreen ||
                document.webkitExitFullscreen ||
                document.webkitCancelFullScreen ||
                document.mozExitFullscreen ||
                document.mozCancelFullScreen ||
                document.msExitFullscreen ||
                document.msCancelFullScreen);

        //quando clicado no exit ira remover todas as classes do fullscreen.
        if (exitFullScreen) {
            $('div.camera-container').removeClass('smartnvr-camera-container');
            $('div.camera-overlay-top').removeClass('smartnvr-camera-overlay-top');

            exitFullScreen.call(document);
        }
    }

    function isFullScreen() {
        return fullScreenCameraId != null;   
    }
    cameraImg.addClass('initializing');
    cameraImg[0].initializing = true;
    cameraImg.height(Math.round(cameraImg.width() * 0.75));

}

function refreshCameraFrames() {
    var timestamp = new Date().getTime();

    if ($('div.modal-container').is(':visible')) {
        /* pause camera refresh if hidden by a dialog */
        return setTimeout(refreshCameraFrames, 1000);
    }

    function refreshCameraFrame(cameraId, img, serverSideResize, id_merge) {
        if (refreshDisabled[cameraId]) {
            /* camera refreshing disabled, retry later */
            
            return;
        }
        
        if (img.loading) {
            img.loading++; /* increases each time the camera would refresh but is still loading */
            
            if (img.loading > 2 * 1000 / refreshInterval) { /* limits the retries to one every two seconds */
                img.loading = 0;
            }
            else {
                return; /* wait for the previous frame to finish loading */
            }
        }
        var basePath = $('div.div-cam#camera' + cameraId + "_" + id_merge).attr('url');
        //Caso o basePath for undefined, busca uma outra alternativa (Tela do terminal popup ao abrir o dialog critico)
        if (typeof basePath == 'undefined'){
            var system = img.id.split('_')[3]
            var basePath = $('#popup_' + system + '_' + id_merge).attr('url');
        }
        if (typeof basePath != 'undefined') {
            var path = basePath + 'picture/' + cameraId + '/current/?_=' + timestamp;
            if (resolutionFactor != 1) {
                path += '&width=' + resolutionFactor;
            }
            else if (serverSideResize) {
                path += '&width=' + img.width;
            }

            path = addAuthParams('GET', path);

            img.src = path;
            img.loading = 1;
        }
    }

    var cameraFrames;
    cameraFrames = $.merge(getCameraFrames(), getCameraFramesPopup());

    
    cameraFrames.each(function () {
        if (!this.img) {
            this.img = $(this).find('img.camera')[0];
        }

        var count = parseInt(1000 / (refreshInterval * streaming_framerate));
        var serverSideResize = streaming_server_resize;
        var selector = this.id.split('_')
        var cameraId = selector[0].substring(6);
        var id_merge = selector[1] + "_" + selector[2]

        count /= framerateFactor;

        /* if frameFactor is 0, we only want one camera refresh at the beginning,
         * and no subsequent refreshes at all */
        if (framerateFactor == 0 && this.refreshDivider == 0) {
            refreshCameraFrame(cameraId, this.img, serverSideResize, id_merge);
            this.refreshDivider++;
        }
        if (this.img.error) {
            /* in case of error, decrease the refresh rate to 1 fps */            
            count = 1000 / refreshInterval;
        }

        if (this.refreshDivider < count) {
            this.refreshDivider++;
        }
        else {
            refreshCameraFrame(cameraId, this.img, serverSideResize, id_merge);
            this.refreshDivider = 0;
        }
    });

    setTimeout(refreshCameraFrames, refreshInterval);
}

function setupCameraFrame(cameraFrameDiv, height) {
    var cameraPlaceholder = cameraFrameDiv.find('div.camera-placeholder');
    var cameraProgress = cameraFrameDiv.find('div.camera-progress');
    var cameraImg = cameraFrameDiv.find('img.camera');
    var progressImg = cameraFrameDiv.find('img.camera-progress');

    cameraFrameDiv[0].refreshDivider = 0;
    cameraFrameDiv[0].streamingFramerate = parseInt(cameraFrameDiv.attr('streaming_framerate')) || 1;
    cameraFrameDiv[0].streamingServerResize = cameraFrameDiv.attr('streaming_server_resize') == 'true';
    progressImg.attr('src', staticPath + 'img/camera-progress.gif');

    cameraProgress.addClass('visible');
    //cameraProgress.css('top', '12em')
    cameraPlaceholder.css('opacity', '0');

    /* fade in */
    cameraFrameDiv.animate({'opacity': 1}, 100);
    //cameraFrameDiv.css('height', height)

    /* error and load handlers */
    cameraImg.error(function () {
        this.error = true;
        this.loading = 0;

        cameraImg.addClass('error').removeClass('initializing');
        cameraImg.height(Math.round(cameraImg.width() * 0.75));
        cameraPlaceholder.css('opacity', 1);
        cameraProgress.removeClass('visible');
        cameraFrameDiv.removeClass('motion-detected');
    });
    cameraImg.load(function () {
        if (refreshDisabled) {
            return; /* refresh temporarily disabled for updating */
        }

        this.error = false;
        this.loading = 0;

        cameraImg.removeClass('error').removeClass('loading');
        cameraPlaceholder.css('opacity', 0);
        cameraProgress.removeClass('visible');

        if (this.initializing) {
            cameraProgress.removeClass('visible');
            cameraImg.removeClass('initializing');
            cameraImg.css('height', '');
            this.initializing = false;

            updateLayout();
        }

        /* there's no point in looking for a cookie update more often than once every second */
        // var now = new Date().getTime();
        // if ((!this.lastCookieTime || now - this.lastCookieTime > 1000) && (cameraFrameDiv[0].proto != 'mjpeg')) {
        //     if (getCookie('motion_detected_' + cameraId) == 'true') {
        //         cameraFrameDiv.addClass('motion-detected');
        //     }
        //     else {
        //         cameraFrameDiv.removeClass('motion-detected');
        //     }
        //
        //     this.lastCookieTime = now;
        // }
    });

    cameraImg.addClass('initializing');
    cameraImg[0].initializing = true;
    cameraImg.height(Math.round(cameraImg.width() * 0.75));

    //refreshOneCameraFrame(cameraFrameDiv, basePath);
}
    /* One camera frame */

// function refreshOneCameraFrame($cameraFrame, basePath) {
//     var cameraFrame = $cameraFrame[0];
//     var img = $cameraFrame.find('img.camera')[0];
//     var cameraId = cameraFrame.id.replace('popup_', '').substring(6);
//
//     var count = 1000 / (refreshInterval * cameraFrame.streamingFramerate);
//
//     if (img.error) {
//         /* in case of error, decrease the refresh rate to 1 fps */
//         count = 1000 / refreshInterval;
//     }
//
//     if (cameraFrame.refreshDivider < count) {
//         cameraFrame.refreshDivider++;
//     }
//     else {
//         (function () {
//             if (refreshDisabled) {
//                 /* camera refreshing disabled, retry later */
//
//                 return;
//             }
//
//             if (img.loading) {
//                 img.loading++; /* increases each time the camera would refresh but is still loading */
//
//                 if (img.loading > 2 * 1000 / refreshInterval) { /* limits the retry at one every two seconds */
//                     img.loading = 0;
//                 }
//                 else {
//                     return; /* wait for the previous frame to finish loading */
//                 }
//             }
//             var timestamp = new Date().getTime();
//             var path = basePath + 'picture/' + cameraId + '/current/?_=' + timestamp;
//             if (cameraFrame.serverSideResize) {
//                 path += '&width=' + img.width;
//             }
//
//             path = addAuthParams('GET', path);
//             img.src = path;
//             img.loading = 1;
//
//             cameraFrame.refreshDivider = 0;
//         })();
//     }
//
//     setTimeout(refreshOneCameraFrame($cameraFrame, basePath), refreshInterval);
// }

    /* startup function */

$(document).ready(function () {    
    window.username = "admin"
    window.passwordHash = sha1("atk130").toLowerCase();

    // refreshCameraFrames();
    // checkCameraErrors();
});

$(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e) {
    const state = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
    const event = state ? 'FullscreenOn' : 'FullscreenOff';

    if (event == "FullscreenOff") {
        $('div.camera-container').removeClass('smartnvr-camera-container');
        $('div.camera-overlay-top').removeClass('smartnvr-camera-overlay-top');
        fullScreenCameraId = null
    }
});
