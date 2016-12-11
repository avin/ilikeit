var casper = require('casper');
var _ = require('lodash');
var config = require('config');

var cs = casper.create({
    verbose: false,
    logLevel: 'warning',
    pageSettings: {
        loadImages: false,
        loadPlugins: false,
        userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
    },
    clientScripts: ['vendor/jquery.js']
});

/**
 * Лайк поста (скрипт для страницы)
 * @returns {boolean}
 */
function likePost() {
    var $sel = $('.post_like._like_wrap:not(.my_like)').first();
    $($sel).click();
    __utils__.echo('MESSAGE_LIKED');

    return true;
}

/**
 * Отправить сообщение другу
 * @param userId
 * @param message
 */
function sendFriendMessage(userId, message) {
    cs.waitForSelector('a[href="/friends"]', function () {
        this.click('a[href="/friends"]');
    });

    cs.waitForSelector('a[href="write' + userId + '"]', function () {
        this.click('a[href="write' + userId + '"]');
    });

    cs.waitForSelector('#mail_box_editable', function () {
        this.sendKeys('#mail_box_editable', message, {keepFocus: true});
        this.click('#mail_box_send');
    });
}

/**
 * Лайкнуть первый пост по ссылке
 * @param url
 */
function likeFirstMessage(url) {
    cs.thenOpen(url);
    cs.waitForSelector('.post_like._like_wrap:not(.my_like)', function () {
        this.click('.post_like._like_wrap:not(.my_like)');
    }, function () {
        this.echo('no like button found');
        this.capture('noLike.png')
    });
    cs.wait(_.random(1000, 5000), function () {
        this.echo('done:' + url)
    })
}

/**
 * Авторизация
 * @param login
 * @param password
 */
function doAuth(login, password) {
    cs.thenOpen('https://vk.com/');
    cs.waitForSelector('form[name="login"]', function () {
        this.fill('form[name="login"]', {
            email: login,
            pass: password,
        }, true);
    });
}

function doLogout() {
    cs.waitForSelector('#top_profile_link', function () {
        this.click('#top_profile_link')
    }, function () {
        this.capture('1.png')
    });
    cs.waitForSelector('#top_logout_link', function () {
        this.click('#top_logout_link')
    }, function () {
        this.capture('1.png')
    });
    cs.waitForSelector('#quick_login', function () {
        this.echo('logout success');
    }, function () {
        this.capture('1.png')
    });
}

cs.start('https://vk.com/');

_.each(config.accounts
    , function (account) {

        cs.then(function () {
            cs.echo('[START ACCOUNT: ' + account.login);
        });


        cs.then(function () {
            doAuth(account.login, account.password);
        });
        _.each(config.pages,
            function (link) {
                cs.then(function () {
                    likeFirstMessage(link);
                });
            });

        doLogout();
    });

cs.run(function () {
    this.echo('DONE').exit()
});