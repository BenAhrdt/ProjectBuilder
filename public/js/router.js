import * as customers from "./views/customers.js";
import * as articles from "./views/articles.js";
import * as importPricelist from "./views/importPriclist.js";
import * as navbar from "./base/navbar.js";

const routes = {
    "/": {
        render: customers.renderView,
        active: 'customers',
    },
    "/customers": {
        render: customers.renderView,
        active: 'customers',
    },
    "/articles": {
        render: articles.renderView,
        active: 'articles',
    },
    "/importPricelist": {
        render: importPricelist.renderView,
        active: 'importPricelist',
    },
};

function navigate(path) {

    // URL ändern
    history.pushState({}, "", path);

    // passende Route rendern
    renderRoute(path);

}

function renderRoute(path) {

    const route = routes[path];

    if(route) {

        navbar.setItemsActive(route.active);
        route.render();

    } else {

        console.warn("Keine Route gefunden:", path);

    }

}

export {
    navigate,
    renderRoute
}