import express from "express";

import * as database
from "../database/index.js";

const router =
    express.Router();

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
                sortOrder

            )

            VALUES (

                @projectId,
                @parentId,
                @type,
                @name,
                @sortOrder

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
                req.body.sortOrder ?? nextSortOrder

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

        database.projectNodes.prepare(`

            UPDATE projectNodes

            SET
                parentId = @parentId,
                sortOrder = @sortOrder

            WHERE id = @id

        `).run({

            id:
                req.params.id,

            parentId,

            sortOrder:
                req.body.sortOrder ?? current.sortOrder ?? 0

        });

        const updateSortOrder =
            database.projectNodes.prepare(`

                UPDATE projectNodes

                SET sortOrder = @sortOrder

                WHERE id = @id

            `);

        if (Array.isArray(req.body.siblings)) {

            const transaction =
                database.projectNodes.transaction(siblings => {

                    siblings.forEach((nodeId, index) => {

                        updateSortOrder.run({

                            id:
                                nodeId,

                            sortOrder:
                                index

                        });

                    });

                });

            transaction(
                req.body.siblings
            );

        }

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

        const insertNode =
            database.projectNodes.prepare(`

                INSERT INTO projectNodes (

                    projectId,
                    parentId,
                    type,
                    name,
                    sortOrder

                )

                VALUES (

                    @projectId,
                    @parentId,
                    @type,
                    @name,
                    @sortOrder

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
                    sortOrder

                )

                VALUES (

                    @projectNodeId,
                    @articleNumber,
                    @quantity,
                    @positionName,
                    @sortOrder

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
                                ? `${node.name} Kopie`
                                : node.name,

                        sortOrder:
                            node.sortOrder ?? 0

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
                                index

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

            SET name = @name

            WHERE id = @id

        `).run({

            id:
                req.params.id,

            name:
                req.body.name ?? current.name

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
