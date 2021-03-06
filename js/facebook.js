(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = 'https://connect.facebook.net/zh_TW/sdk.js#xfbml=1&autoLogAppEvents=1&version=v5.0&appId=1385360291698338';
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

window.fbAsyncInit = function () {
    FB.init({
        appId: '1385360291698338',
        /* cookie: true, */
        xfbml: true,
        version: 'v5.0'
    });
};

var facebookMe = {
    id: 0,
    name: "",
    email: "",
    accessToken: "",
    target: {
        hashtag: "#三立新聞網活動",
        refer: "",
        href: ""
    },
    connect: function (callback, ...callbackArg) {
        FB.getLoginStatus(function (response) {
            if (response.status == 'connected') {
                facebookMe.id = response.authResponse.userID;
                facebookMe.accessToken = response.authResponse.accessToken;

                FB.api('/me?fields=id,name,email,picture', function (response) {
                    facebookMe.id = response.id;
                    facebookMe.name = response.name;
                    facebookMe.email = response.email;

                    $.ajax({
                        type: "POST",
                        url: "https://event.setn.com/api/event-public-api/collection",
                        data: {
                            action: "connect",
                            id: facebookMe.id,
                            name: facebookMe.name,
                            email: facebookMe.email
                        },
                        success: function (data) {
                        }
                    });

                    callback(callbackArg[0], callbackArg[1]);
                });
            } else {
                FB.login(function (response) {
                    if (response.status == 'connected') {
                        facebookMe.id = response.authResponse.userID;
                        facebookMe.accessToken = response.authResponse.accessToken;
                        callback(callbackArg[0], callbackArg[1]);
                    }
                }, {
                    scope: 'email, public_profile',
                    return_scopes: true
                });
            }
        });
    },
    share: function (callback, callbackArg) {
        if (facebookMe.id == "") {
            facebookMe.connect(facebookMe.share, callback, callbackArg);
            return true;
        }

        FB.ui({
            method: "share",
            mobile_iframe: true,
            hashtag: facebookMe.target.hashtag,
            href: facebookMe.target.href
        }, function (response) {
            $.ajax({
                type: "POST",
                url: "https://event.setn.com/api/event-public-api/collection",
                dataType: "json",
                data: {
                    action: "share",
                    event: facebookMe.target.refer,
                    target: facebookMe.target.href,
                    id: facebookMe.id,
                    accessToken: facebookMe.accessToken,
                    message: response.error_message
                },
                success: function (data) {
                }
            });

            if (!response.error_code) {
                if (callbackArg) {
                    callback(callbackArg);
                }
            }
        })
    }
};

$(document).ready(function () {
    $(document)
        .on("click", ".fb_share", function (e) {
            facebookMe.target.refer = this.dataset.refer || facebookMe.target.refer;
            facebookMe.target.href = this.dataset.href || facebookMe.target.href;
            facebookMe.target.hashtag = this.dataset.hashtag || facebookMe.target.hashtag;
            facebookMe.share();
        });
});
