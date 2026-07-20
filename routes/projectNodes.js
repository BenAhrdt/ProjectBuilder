import express from "express";

import * as database
from "../database/index.js";

const router =
    express.Router();

router.get(
    "/search",
    (req, res) => {

        const search =
            String(req.query.search ?? "").trim();

        if (search.length < 2) {
            res.json([]);
            return;
        }

        const normalize = value =>
            String(value ?? "")
                .toLocaleLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

        const normalizedSearch =
            normalize(search);

        const nodes =
            database.projectNodes.prepare(`

                SELECT
                    projectNodes.*,
                    projects.name AS projectName

                FROM projectNodes

                LEFT JOIN projects
                ON projects.id = projectNodes.projectId

                ORDER BY
                    projects.name,
                    COALESCE(projectNodes.sortOrder, projectNodes.id),
                    projectNodes.id

            `).all();

        const nodesByProjectAndId =
            new Map(
                nodes.map(node => [
                    `${node.projectId}:${node.id}`,
                    node
                ])
            );

        const results =
            nodes
                .filter(node =>
                    normalize(node.name).includes(normalizedSearch)
                )
                .map(node => {
                    const path = [node.name];
                    const visited = new Set([String(node.id)]);
                    let parentId = node.parentId;

                    while (
                        parentId != null
                        && !visited.has(String(parentId))
                    ) {
                        visited.add(String(parentId));
                        const parent = nodesByProjectAndId.get(
                            `${node.projectId}:${parentId}`
                        );
                        if (!parent) break;
                        path.unshift(parent.name);
                        parentId = parent.parentId;
                    }

                    return {
                        id: node.id,
                        projectId: node.projectId,
                        projectName: node.projectName,
                        name: node.name,
                        type: node.type,
                        path: path.join(" › ")
                    };
                });

        res.json(results);

    }
);

router.get(
    "/:projectId",
    (req, res) => {

        const nodes =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE projectId = ?

                ORDER BY sortOrder

            `).all(
                req.params.projectId
            );

        res.json(
            nodes
        );

    }
);

router.post(
    "/",
    (req, res) => {

        const nextSortOrder =
            database.projectNodes.prepare(`

                SELECT COALESCE(MAX(sortOrder), -1) + 1 AS sortOrder

                FROM projectNodes

                WHERE projectId = ?
                AND (
                    parentId IS ?
                    OR parentId = ?
                )

            `).get(
                req.body.projectId,
                req.body.parentId ?? null,
                req.body.parentId ?? null
            ).sortOrder;

        const result =
            database.projectNodes.prepare(`

            INSERT INTO projectNodes (

                projectId,
                parentId,
                type,
                name,
                sortOrder,
                physicalQuantity,
                deviceDesignation,
                dataCollectionLocation,
                fundingObject,
                responsibility,
                collectionFrequency,
                thirdPartyQuantity

            )

            VALUES (

                @projectId,
                @parentId,
                @type,
                @name,
                @sortOrder,
                @physicalQuantity,
                @deviceDesignation,
                @dataCollectionLocation,
                @fundingObject,
                @responsibility,
                @collectionFrequency,
                @thirdPartyQuantity

            )

        `).run({

            projectId:
                req.body.projectId,

            parentId:
                req.body.parentId,

            type:
                req.body.type,

            name:
                req.body.name,

            sortOrder:
                req.body.sortOrder ?? nextSortOrder,

            physicalQuantity: req.body.physicalQuantity ?? "kWh",
            deviceDesignation: req.body.deviceDesignation ?? "",
            dataCollectionLocation: req.body.dataCollectionLocation ?? "",
            fundingObject: req.body.fundingObject ?? "",
            responsibility: req.body.responsibility ?? "",
            collectionFrequency: req.body.collectionFrequency ?? "",
            thirdPartyQuantity: req.body.thirdPartyQuantity ?? ""

        });

        const node =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE id = ?

            `).get(
                result.lastInsertRowid
            );

        res.json(
            node
        );

    }
);

router.patch(
    "/:id/move",
    (req, res) => {

        const current =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE id = ?

            `).get(
                req.params.id
            );

        if (!current) {

            res.status(404).json({
                error: "Node nicht gefunden"
            });

            return;

        }

        const parentId =
            req.body.parentId ?? null;

        const updateSortOrder =
            database.projectNodes.prepare(`

                UPDATE projectNodes

                SET
                    parentId = @parentId,
                    sortOrder = @sortOrder

                WHERE id = @id

            `);

        const transaction =
            database.projectNodes.transaction(() => {

                if (Array.isArray(req.body.siblings)) {

                    req.body.siblings.forEach((nodeId, index) => {

                        updateSortOrder.run({

                            id:
                                nodeId,

                            parentId,

                            sortOrder:
                                index

                        });

                    });

                    return;

                }

                updateSortOrder.run({

                    id:
                        req.params.id,

                    parentId,

                    sortOrder:
                        req.body.sortOrder ?? current.sortOrder ?? 0

                });

            });

        transaction();

        const updated =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE id = ?

            `).get(
                req.params.id
            );

        res.json(
            updated
        );

    }
);

router.post(
    "/:id/duplicate",
    (req, res) => {

        const sourceNode =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE id = ?

            `).get(
                req.params.id
            );

        if (!sourceNode) {

            res.status(404).json({
                error: "Node nicht gefunden"
            });

            return;

        }

        const copySuffix =
            String(
                req.body?.copySuffix
                ||
                "Kopie"
            ).trim()
            ||
            "Kopie";

        const escapeRegExp =
            value =>
                String(value).replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

        const copyNamePattern =
            new RegExp(
                `\\s+${escapeRegExp(copySuffix)}(?:\\s+\\d+)?$`
            );

        const getSiblingNames =
            database.projectNodes.prepare(`

                SELECT name

                FROM projectNodes

                WHERE projectId = @projectId
                AND (
                    parentId = @parentId
                    OR (
                        parentId IS NULL
                        AND @parentId IS NULL
                    )
                )

            `);

        const getCopyName =
            node => {

                const baseName =
                    String(node.name ?? "")
                        .replace(
                            copyNamePattern,
                            ""
                        )
                        .trim()
                    ||
                    String(node.name ?? "").trim()
                    ||
                    copySuffix;

                const siblingNames =
                    new Set(
                        getSiblingNames
                            .all({
                                projectId:
                                    node.projectId,

                                parentId:
                                    node.parentId
                            })
                            .map(sibling =>
                                String(sibling.name ?? "")
                            )
                    );

                let copyName =
                    `${baseName} ${copySuffix}`;

                let copyNumber =
                    2;

                while (
                    siblingNames.has(
                        copyName
                    )
                ) {

                    copyName =
                        `${baseName} ${copySuffix} ${copyNumber}`;

                    copyNumber += 1;

                }

                return copyName;

            };

        const insertNode =
            database.projectNodes.prepare(`

                INSERT INTO projectNodes (

                    projectId,
                    parentId,
                    type,
                    name,
                    sortOrder,
                    physicalQuantity,
                    deviceDesignation,
                    dataCollectionLocation,
                    fundingObject,
                    responsibility,
                    collectionFrequency,
                    thirdPartyQuantity

                )

                VALUES (

                    @projectId,
                    @parentId,
                    @type,
                    @name,
                    @sortOrder,
                    @physicalQuantity,
                    @deviceDesignation,
                    @dataCollectionLocation,
                    @fundingObject,
                    @responsibility,
                    @collectionFrequency,
                    @thirdPartyQuantity

                )

            `);

        const getNode =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE id = ?

            `);

        const getChildNodes =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE parentId = ?

                ORDER BY sortOrder, id

            `);

        const getNodeArticles =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodeArticles

                WHERE projectNodeId = ?

                ORDER BY
                    COALESCE(sortOrder, id) ASC,
                    id ASC

            `);

        const insertNodeArticle =
            database.projectNodes.prepare(`

                INSERT INTO projectNodeArticles (

                    projectNodeId,
                    articleNumber,
                    quantity,
                    positionName,
                    sortOrder,
                    isOptional,
                    isAlternative

                )

                VALUES (

                    @projectNodeId,
                    @articleNumber,
                    @quantity,
                    @positionName,
                    @sortOrder,
                    @isOptional,
                    @isAlternative

                )

            `);

        const duplicateNode =
            (node, parentId, isRoot = false) => {

                const result =
                    insertNode.run({

                        projectId:
                            node.projectId,

                        parentId,

                        type:
                            node.type,

                        name:
                            isRoot
                                ? getCopyName(
                                    node
                                )
                                : node.name,

                        sortOrder:
                            node.sortOrder ?? 0,

                        physicalQuantity: node.physicalQuantity ?? "kWh",
                        deviceDesignation: node.deviceDesignation ?? "",
                        dataCollectionLocation: node.dataCollectionLocation ?? "",
                        fundingObject: node.fundingObject ?? "",
                        responsibility: node.responsibility ?? "",
                        collectionFrequency: node.collectionFrequency ?? "",
                        thirdPartyQuantity: node.thirdPartyQuantity ?? ""

                    });

                const newNode =
                    getNode.get(
                        result.lastInsertRowid
                    );

                getNodeArticles
                    .all(node.id)
                    .forEach((nodeArticle, index) => {

                        insertNodeArticle.run({

                            projectNodeId:
                                newNode.id,

                            articleNumber:
                                nodeArticle.articleNumber,

                            quantity:
                                nodeArticle.quantity ?? 1,

                            positionName:
                                nodeArticle.positionName ?? null,

                            sortOrder:
                                index,

                            isOptional: nodeArticle.isOptional ? 1 : 0,
                            isAlternative: nodeArticle.isAlternative ? 1 : 0

                        });

                    });

                getChildNodes
                    .all(node.id)
                    .forEach(childNode => {

                        duplicateNode(
                            childNode,
                            newNode.id
                        );

                    });

                return newNode;

            };

        const transaction =
            database.projectNodes.transaction(() =>
                duplicateNode(
                    sourceNode,
                    sourceNode.parentId,
                    true
                )
            );

        res.json(
            transaction()
        );

    }
);

router.patch(
    "/:id",
    (req, res) => {

        const current =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE id = ?

            `).get(
                req.params.id
            );

        if (!current) {

            res.status(404).json({
                error: "Node nicht gefunden"
            });

            return;

        }

        database.projectNodes.prepare(`

            UPDATE projectNodes

            SET
                name = @name,
                physicalQuantity = @physicalQuantity,
                deviceDesignation = @deviceDesignation,
                dataCollectionLocation = @dataCollectionLocation,
                fundingObject = @fundingObject,
                responsibility = @responsibility,
                collectionFrequency = @collectionFrequency,
                thirdPartyQuantity = @thirdPartyQuantity

            WHERE id = @id

        `).run({

            id:
                req.params.id,

            name:
                req.body.name ?? current.name,

            physicalQuantity: req.body.physicalQuantity ?? current.physicalQuantity ?? "kWh",
            deviceDesignation: req.body.deviceDesignation ?? current.deviceDesignation ?? "",
            dataCollectionLocation: req.body.dataCollectionLocation ?? current.dataCollectionLocation ?? "",
            fundingObject: req.body.fundingObject ?? current.fundingObject ?? "",
            responsibility: req.body.responsibility ?? current.responsibility ?? "",
            collectionFrequency: req.body.collectionFrequency ?? current.collectionFrequency ?? "",
            thirdPartyQuantity: req.body.thirdPartyQuantity ?? current.thirdPartyQuantity ?? ""

        });

        const updated =
            database.projectNodes.prepare(`

                SELECT *

                FROM projectNodes

                WHERE id = ?

            `).get(
                req.params.id
            );

        res.json(
            updated
        );

    }
);

router.delete(
    "/:id",
    (req, res) => {

        const getChildNodes =
            database.projectNodes.prepare(`

                SELECT id

                FROM projectNodes

                WHERE parentId = ?

            `);

        const deleteNodeArticles =
            database.projectNodes.prepare(`

                DELETE FROM projectNodeArticles

                WHERE projectNodeId = ?

            `);

        const deleteNode =
            database.projectNodes.prepare(`

                DELETE FROM projectNodes

                WHERE id = ?

            `);

        const deleteRecursive =
            nodeId => {

                getChildNodes
                    .all(nodeId)
                    .forEach(childNode => {

                        deleteRecursive(
                            childNode.id
                        );

                    });

                deleteNodeArticles.run(
                    nodeId
                );

                deleteNode.run(
                    nodeId
                );

            };

        const transaction =
            database.projectNodes.transaction(() => {

                deleteRecursive(
                    req.params.id
                );

            });

        transaction();

        res.json({
            success: true
        });

    }
);

export default router;
