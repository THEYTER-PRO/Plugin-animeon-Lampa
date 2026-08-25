(function () {
    'use strict';

    var PROXY_URL = 'https://corsproxy.io/?';
    var TARGET_SITE = 'https://v1.animeon.co';

    function startPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                var card = e.object.method === 'movie' ? e.object.movie : e.object.card;

                if (render.find('.button--animeon').length === 0) {
                    var button = $(
                        '<div class="full-start__button selector button--animeon">' +
                            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                                '<polygon points="5 3 19 12 5 21 5 3"></polygon>' +
                            '</svg>' +
                            '<span>AnimeOn</span>' +
                        '</div>'
                    );

                    button.on('hover:enter', function () {
                        var query = card.title  card.name  card.original_title;
                        searchAnime(query);
                    });

                    render.find('.full-start__buttons').append(button);
                }
            }
        });
    }

    function searchAnime(query) {
        Lampa.Noty.show('Поиск на AnimeOn: ' + query);

        var targetUrl = TARGET_SITE + '/search?q=' + encodeURIComponent(query);
        var searchUrl = PROXY_URL + encodeURIComponent(targetUrl);

        $.ajax({
            url: searchUrl,
            type: 'GET',
            dataType: 'text',
            success: function (response) {
                try {
                    var results = [];
                    // Безопасный поиск ссылок через регулярное выражение для телевизоров
                    var regex = /<a[^>]+href=["']([^"']*\/anime\/[^"']*)["'][^>]*>(.*?)<\/a>/gi;
                    var match;

                    while ((match = regex.exec(response)) !== null) {
                        var link = match[1];
                        // Очищаем текст от тегов внутри ссылки
                        var title = match[2].replace(/<[^>]*>/g, '').trim();

                        if (link && title && results.length < 15) {
                            if (link.indexOf('http') !== 0) {
                                link = TARGET_SITE + (link.indexOf('/') === 0 ? '' : '/') + link;
                            }
                            // Убираем дубликаты
                            var exists = false;
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].url === link) exists = true;
                            }
                            if (!exists) {
                                results.push({ title: title, url: link });
                            }
                        }
                    }

                    if (results.length === 0) {
                        Lampa.Noty.show('Ничего не найдено');
                        return;
                    }

                    if (results.length === 1) {
                        parsePlayerPage(results[0].url, query);
                    } else {
                        Lampa.Select.show({
                            title: 'Результаты AnimeOn',
                            items: results,
                            onSelect: function (item) {
                                parsePlayerPage(item.url, item.title);
                            }
                        });
                    }
                } catch (err) {
                    Lampa.Noty.show('Ошибка обработки данных');
                }
            },
            error: function () {
                Lambda.Noty.show('Ошибка сети');
            }
        });
    }

    function parsePlayerPage(pageUrl, title) {
        Lampa.Noty.show('Загрузка плеера...');
        var targetUrl = PROXY_URL + encodeURIComponent(pageUrl);

        $.ajax({
            url: targetUrl,
            type: 'GET',
            dataType: 'text',
            success: function (response) {
                var streamUrl = '';
                
                // Ищем iframe или video src через регулярку
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

                    Lampa.Player.play({
                        title: title,
                        url: streamUrl
                    });
                } else {
                    Lampa.Noty.show('Видеопоток не найден');
                }
            },
            error: function () {
                Lampa.Noty.show('Ошибка загрузки страницы');
            }
        });
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
