(function($) {
    // TODO: make the node ID configurable
    var treeNode = $('#jsdoc-toc-nav');

    // initialize the tree
    treeNode.tree({
        autoEscape: false,
        closedIcon: '&#x21e2;',
        data: [{"label":"<a href=\"module-minerva-requests.html\">minerva-requests</a>","id":"module:minerva-requests","children":[{"label":"<a href=\"module-minerva-requests-request.html\">request</a>","id":"module:minerva-requests~request","children":[]},{"label":"<a href=\"module-minerva-requests-request_set.html\">request_set</a>","id":"module:minerva-requests~request_set","children":[]},{"label":"<a href=\"module-minerva-requests-request_variable.html\">request_variable</a>","id":"module:minerva-requests~request_variable","children":[]}]}],
        openedIcon: ' &#x21e3;',
        saveState: true,
        useContextMenu: false
    });

    // add event handlers
    // TODO
})(jQuery);
