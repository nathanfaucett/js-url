var tape = require("tape"),
    url = require("..");


tape("url", function(assert) {
    assert.deepEquals(url.parse("http://example.com/pathname#hash?id=0"), {
        auth: null,
        hash: '#hash?id=0',
        host: 'example.com',
        hostname: 'example.com',
        href: 'http://example.com/pathname#hash?id=0',
        path: '/pathname',
        pathname: '/pathname',
        port: null,
        protocol: 'http:',
        query: null,
        search: null,
        slashes: true
    });
    assert.equals(url.resolve("http://example.com/pathname", ".."), "http://example.com/");
    assert.deepEquals(url.format({
        auth: null,
        hash: '#hash?id=0',
        host: 'example.com',
        hostname: 'example.com',
        href: 'http://example.com/pathname#hash?id=0',
        path: '/pathname',
        pathname: '/pathname',
        port: null,
        protocol: 'http:',
        query: null,
        search: null,
        slashes: true
    }), "http://example.com/pathname#hash?id=0");
    assert.end();
});
