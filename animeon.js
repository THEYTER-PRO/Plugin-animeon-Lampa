(function () {
    'use strict';

    const PROXY_URL = 'https://corsproxy.io/?';
    const TARGET_SITE = 'https://v1.animeon.co';

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
                    var html = $(response);
                    var results = [];

                    html.find('a[href*="/anime/"], .poster-card, .anime-list-item').each(function () {
                        var element = $(this);
                        var title = element.text().trim() || element.attr('title');
                        var link = element.attr('href');

                        if (link && title) {
                            if (!link.startsWith('http')) {
                                link = TARGET_SITE + (link.startsWith('/') ? '' : '/') + link;
                            }
                            results.push({ title: title, url: link });
                        }
                    });

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
                    Lampa.Noty.show('Ошибка парсинга ответа');
                }
            },
            error: function () {
                Lampa.Noty.show('Ошибка запроса через прокси');
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
                var html = $(response);
                
                var iframeSrc = html.find('iframe').attr('src');
                var videoSrc = html.find('video source').attr('src') || html.find('video').attr('src');

                var streamUrl = videoSrc || iframeSrc;

                if (streamUrl) {
                    if (streamUrl.startsWith('//')) {
                        streamUrl = 'https:' + streamUrl;
                    } else if (!streamUrl.startsWith('http')) {
                        streamUrl = TARGET_SITE + (streamUrl.startsWith('/') ? '' : '/') + streamUrl;
                    }

                    Lampa.Player.play({
                        title: title,
                        url: streamUrl
                    });
                } else {
                    Lampa.Noty.show('Прямой видеопоток не найден');
                }
            },
            error: function () {
                Lampa.Noty.show('Ошибка загрузки страницы видео');
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
