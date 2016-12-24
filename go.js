var casper = require('casper');
var _ = require('lodash');
var config = require('config');
var fs = require('fs');

var logObj = {
    invitedFriends: {}
};

var cs = casper.create({
    verbose: true,
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
        //this.capture('noLike.png')
    });
    cs.wait(_.random(1000, 5000), function () {
        this.echo('done:' + url)
    })
}

function repostFirstMessage(url) {
    cs.thenOpen(url);
    cs.waitForSelector('.post_share:not(.my_share)', function () {
        this.click('.post_share:not(.my_share)');
        this.waitForSelector('.like_share_btn', function () {
            this.click('.like_share_btn')
        });
    }, function () {
        this.echo('no repost button found');
        //this.capture('noLike.png')
    });
    cs.wait(_.random(1000, 5000), function () {
        this.echo('done repost:' + url)
    })
}

/**
 * Авторизация
 * @param login
 * @param password
 */
function doAuth(login, password) {
    cs.thenOpen('https://vk.com/', function () {
        cs.waitForSelector('form[name="login"]', function () {
            this.fill('form[name="login"]', {
                email: login,
                pass: password,
            }, true);
        });
    });

}

/**
 * Разлогиниться
 */
function doLogout() {
    cs.waitForSelector('#top_profile_link', function () {
        this.click('#top_profile_link')
    }, function () {
        //this.capture('1.png')
    });
    cs.waitForSelector('#top_logout_link', function () {
        this.click('#top_logout_link')
    }, function () {
        //this.capture('1.png')
    });
    cs.waitForSelector('#quick_login', function () {
        this.echo('logout success');
    }, function () {
        //this.capture('1.png')
    });
}

/**
 * Принять приглашение в друзья
 */
function acceptFriends() {
    cs.thenOpen('https://vk.com/friends', function () {
        this.waitForSelector('button[id^="accept_request_"]', function () {
            this.click('button[id^="accept_request_"]');
        }, function () {
            this.echo('no new friends')
        });
    })
}

/**
 * Попроситься в друзья
 * @param account
 */
function makeFriends(account) {

    if (logObj.invitedFriends[account.login] === undefined) {
        logObj.invitedFriends[account.login] = []
    }

    var todayFriendsCount = 0;
    logObj.invitedFriends[account.login].forEach(function (invitedFriend) {
        if ((+new Date() - invitedFriend.invitedAt) < config.options.period) {
            todayFriendsCount++
        }
    });

    config.newFriends.forEach(function (friendUrl) {

        //Ищем не добавлен ли уже такой профиль в друзья
        var alreadyInvited = _.find(logObj.invitedFriends[account.login], function (item) {
            return (item.friendUrl === friendUrl)
        });

        if (!alreadyInvited) {

            if (todayFriendsCount < config.options.friendsPerPeriodLimit) {
                cs.then(function () {

                    console.log(friendUrl);

                    this.thenOpen(friendUrl, function () {

                        this.waitForSelector('#friend_status > div > button', function () {

                            this.click('#friend_status > div > button');

                            this.wait(1000);

                            if (account.likeForNewFriend) {
                                likeFirstMessage(friendUrl)
                            }

                            this.then(function () {
                                console.log('invited ' + friendUrl);
                                //Пишем в лог что добавили друга
                                logObj.invitedFriends[account.login].push({
                                    friendUrl: friendUrl,
                                    invitedAt: (+new Date())
                                });
                            })
                        }, function () {
                            this.capture('no_new_friend.png');
                            this.echo('no accept friend button')
                        });
                    }, function () {
                        this.echo('wrong friendurl??')
                    });
                });
                todayFriendsCount++;
            }
        }
    });
}

function startCasper() {
    cs.start('https://vk.com/');

    _.each(config.accounts, function (account) {

        cs.then(function () {
            cs.echo('==== START ACCOUNT: ' + account.login + ' ====');
        });

        cs.then(function () {
            //Авторизируемсы
            doAuth(account.login, account.password);
        });

        //Добавляем друзей из списка
        if (account.makeFriends) {
            makeFriends(account);
        }

        cs.then(function () {
            _.each(config.pages, function (link) {
                if (account.allowReposts && _.random(1, 100) < account.allowReposts) {
                    //Репостим
                    this.then(function () {
                        repostFirstMessage(link)
                    });
                } else if (account.allowLikes && _.random(1, 100) < account.allowLikes) {
                    //Лайкаем
                    this.then(function () {
                        likeFirstMessage(link);
                    });
                }
            }.bind(this));
        });


        if (account.acceptFriends) {
            //Принимаем инвайты в друзья
            acceptFriends();
        }

        doLogout();
    });

    cs.run(function () {
        this.echo('DONE').exit();
        saveLogObj();
    });
}

function saveLogObj() {
    fs.write('log.data', JSON.stringify(logObj, null, 4), 'w');
}

try {
    var data = fs.read('log.data');
    logObj = JSON.parse(data);
} catch (e) {
    console.log('No log data. App will use new one...')
}

startCasper();


