import * as customers from "./views/customers.js";
import * as articles from "./views/articles.js";
import * as importPricelist from "./views/importPriclist.js";
import * as navbar from "./base/navbar.js";
import * as customer from "./views/customer.js";
import * as projects from "./views/projects.js";
import * as project from "./views/project.js";

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
    "/customer": {
        render: customer.renderView,
        active: "customers",
    },
    "/projects": {
        render: projects.renderView,
        active: "projects",
    },
};

function navigate(path) {

    // URL ändern
    history.pushState({}, "", path);

    // passende Route rendern
    renderRoute(path);

}

function renderRoute(path) {

    // Kunde
    if (
        path.startsWith(
            "/customer/"
        )
    ) {

        const customerId =
            path.split("/")[2];

        navbar.setItemsActive(
            "customers"
        );

        customer.renderView(
            customerId
        );

        return;

    }

   //Projekt
    if (
        path.startsWith("/project/")
    ) {

        const projectId =
            path.split("/")[2];

        project.renderView(
            projectId
        );

        return;

    }

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