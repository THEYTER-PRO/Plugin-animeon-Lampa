(function () {
    'use strict';

    function getJQuery() {
        return window.jQuery  (window.Lampa && window.Lampa.jQuery)  null;
    }

    function startPlugin() {
        try {
            if (!window.Lampa || !window.Lampa.Listener) return;

            window.Lampa.Listener.follow('full', function (e) {
                try {
                    if (!e || e.type !== 'complite') return;
                    
                    var $ = getJQuery();
                    if (!$) return;

                    var activity = e.object && e.object.activity;
                    if (!activity || typeof activity.render !== 'function') return;

                    var render = activity.render();
                    if (!render || render.find('.button--animeon').length > 0) return;

                    var card = (e.object.method === 'movie') ? e.object.movie : e.object.card;
                    if (!card) return;

                    var button = $(
                        '<div class="full-start__button selector button--animeon">' +
                            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                '<polygon points="5 3 19 12 5 21 5 3"></polygon>' +
                            '</svg>' +
                            '<span>AnimeOn</span>' +
                        '</div>'
                    );

                    button.on('hover:enter', function () {
                        var query = '';
                        if (card.title) query = card.title;
                        else if (card.name) query = card.name;
                        else if (card.original_title) query = card.original_title;

                        if (query) {
                            searchAnime(query);
                        } else if (window.Lampa && window.Lampa.Noty) {
                            window.Lampa.Noty.show('Не удалось определить название для поиска');
                        }
                    });

                    var buttonsContainer = render.find('.full-start__buttons');
                    if (buttonsContainer.length > 0) {
                        buttonsContainer.append(button);
                    }
                } catch (err) {
                    // Подавление внутренних ошибок отрисовки
                }
            });
        } catch (err) {
            // Подавление ошибок инициализации
        }
    }

    function searchAnime(query) {
        var $ = getJQuery();
        if (!$) return;

        if (window.Lampa && window.Lampa.Noty) {
            window.Lampa.Noty.show('Поиск на AnimeOn: ' + query);
        }

        var PROXY_URL = 'https://corsproxy.io/?';
        var TARGET_SITE = 'https://v1.animeon.co';
        var targetUrl = TARGET_SITE + '/search?q=' + encodeURIComponent(query);
        var searchUrl = PROXY_URL + encodeURIComponent(targetUrl);

        $.ajax({
            url: searchUrl,
            type: 'GET',
            dataType: 'text',
            success: function (response) {
                try {
                    var results = [];
                    var regex = /<a[^>]+href=["']([^"']*\/anime\/[^"']*)["'][^>]*>(.*?)<\/a>/gi;
                    var match;

                    while ((match = regex.exec(response)) !== null) {
                        var link = match[1];
                        var title = match[2] ? match[2].replace(/<[^>]*>/g, '').trim() : '';

                        if (link && title && results.length < 15) {
                            if (link.indexOf('http') !== 0) {
                                link = TARGET_SITE + (link.indexOf('/') === 0 ? '' : '/') + link;
                            }
                            var exists = false;
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].url === link) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (!exists) {
                                results.push({ title: title, url: link });
                            }
                        }
                    }

                    if (results.length === 0) {
                        if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Ничего не найдено на AnimeOn');
                        return;
                    }

                    if (results.length === 1) {
                        parsePlayerPage(results[0].url, query);
                    } else {
                        if (window.Lampa && window.Lampa.Select) {
                            window.Lampa.Select.show({
                                title: 'Результаты AnimeOn',
                                items: results,
                                onSelect: function (item) {
                                    parsePlayerPage(item.url, item.title);
                                }
                            });
                        }
                    }
                } catch (err) {
                    if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Ошибка обработки данных поиска');
                }
            },
            error: function () {
                if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Ошибка сети при поиске');
            }
        });
    }

    function parsePlayerPage(pageUrl, title) {
        var $ = getJQuery();
        if (!$) return;

        if (window.Lampa && window.Lampa.Noty) {
            window.Lampa.Noty.show('Загрузка плеера...');
        }

        var PROXY_URL = 'https://corsproxy.io/?';
        var TARGET_SITE = 'https://v1.animeon.co';
        var targetUrl = PROXY_URL + encodeURIComponent(pageUrl);

        $.ajax({
            url: targetUrl,
            type: 'GET',
            dataType: 'text',
            success: function (response) {
                try {
                    var streamUrl = '';
                    var iframeMatch = response.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                    var videoMatch = response.match(/<video[^>]+src=["']([^"']+)["']/i);
                    var sourceMatch = response.match(/<source[^>]+src=["']([^"']+)["']/i);

                    if (iframeMatch) streamUrl = iframeMatch[1];
                    else if (videoMatch) streamUrl = videoMatch[1];
                    else if (sourceMatch) streamUrl = sourceMatch[1];

                    if (streamUrl) {
                        if (streamUrl.indexOf('//') === 0) {
                            streamUrl = 'https:' + streamUrl;
                        } else if (streamUrl.indexOf('http') !== 0) {
                            streamUrl = TARGET_SITE + (streamUrl.indexOf('/') === 0 ? '' : '/') + streamUrl;
                        }

                        if (window.Lampa && window.Lampa.Player) {
                            window.Lampa.Player.play({
                                title: title,
                                url: streamUrl
                            });
                        }
                    } else {
                        if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Видеопоток не найден на странице');
                    }
                } catch (err) {
                    if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Ошибка разбора плеера');
                }
            },
            error: function () {
                if (window.Lampa && window.Lampa.Noty) window.Lampa.Noty.show('Ошибка загрузки страницы плеера');
            }
        });
    }

    try {
        if (window.appready) {
            startPlugin();
        } else if (window.Lampa && window.Lampa.Listener) {
            window.Lampa.Listener.follow('app', function (e) {
                if (e && e.type === 'ready') {startPlugin();
                }
            });
        } else {
            var checkInterval = setInterval(function () {
                if (window.Lampa && window.Lampa.Listener) {
                    clearInterval(checkInterval);
                    startPlugin();
                }
            }, 500);
        }
    } catch (err) {}
})();
