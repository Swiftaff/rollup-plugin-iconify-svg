const svelte = require("rollup-plugin-svelte");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const css = require("rollup-plugin-css-only");
const commonjs = require("@rollup/plugin-commonjs");
const { terser } = require("rollup-plugin-terser");
const test = require("ava");
const { rollup } = require("rollup");
const rolluppluginiconifysvg = require("../src/index");
const withPage = require("./_withPage");
const fs = require("fs");
const del = require("del");
const path = require("path");

test("test1 basic", async (t) => {
    const bundle = await rollup({
        input: "./test/fixtures/test1/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test1", dest: "./test/outputs/test1.js" }],
                commonJs: true, // allows output file to be required below
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("./outputs/test1.js");
    t.snapshot(icons);
});

test("test2 build a svelte app", withPage, async (t, page) => {
    const bundle = await rollup({
        input: "./example/src/main.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "example/src", dest: "example/src/icons.js" }],
            }),
            svelte(),
            nodeResolve({
                browser: true,
                dedupe: ["svelte"],
            }),
            commonjs(),
            terser(),
        ],
    });
    const output = await bundle.generate({ sourcemap: true, format: "iife" });
    let html = `<!DOCTYPE html><html lang="en"><head><title>Svelte app</title></head><body></body></html>`;
    await page.setContent(html);
    page.evaluate(output.output[0].code);
    const result = await page.content();
    t.snapshot(result);
});

test("test3 build another svelte app", withPage, async (t, page) => {
    const bundle = await rollup({
        input: "./example2/src/main.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [
                    { src: "example2/src", dest: "example2/src/icons.js" },
                    { src: "example2/src/subfolder", dest: "example2/src/subfolder/icons1.js" },
                ],
            }),
            svelte(),
            nodeResolve({
                browser: true,
                dedupe: ["svelte"],
            }),
            css({ output: "bundle.css" }),
            commonjs(),
            terser(),
        ],
    });
    const output = await bundle.generate({ sourcemap: true, format: "iife" });
    let html = `<!DOCTYPE html><html lang="en"><head><title>Svelte app</title></head><body></body></html>`;
    await page.setContent(html);
    page.evaluate(output.output[0].code);
    const result = await page.content();
    t.snapshot(result);
});

test("test4a options - src defaults to 'src'", withPage, async (t, page) => {
    const bundle = await rollup({
        input: "./test/fixtures/test1/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ dest: "./test/outputs/test4a.js" }],
                commonJs: true, // allows output file to be required below
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("./outputs/test4a.js");
    t.snapshot(icons);
});

test("test4b options - dest defaults to 'src/icons.js'", withPage, async (t, page) => {
    const bundle = await rollup({
        input: "./test/fixtures/farandom/index.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/farandom" }],
                commonJs: true, // allows output file to be required below
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("../src/icons.js");
    t.snapshot(icons);
});

test("test4c options - targets defaults to [{ src: 'src', dest: 'src/icons.js' }]", withPage, async (t, page) => {
    const bundle = await rollup({
        input: "./test/fixtures/farandom/index.js",
        plugins: [
            rolluppluginiconifysvg({
                commonJs: true, // allows output file to be required below
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("../src/icons.js");
    t.snapshot(icons);
});

test("test4d options - commonJs defaults to false and saves as es6 module", withPage, async (t, page) => {
    const bundle = await rollup({
        input: "./test/fixtures/test4d/main.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "test/fixtures/test4d", dest: "./test/outputs/test4d.js" }],
            }),
            svelte(),
            nodeResolve({
                browser: true,
                dedupe: ["svelte"],
            }),
            commonjs(),
            terser(),
        ],
    });
    const output = await bundle.generate({ sourcemap: true, format: "iife" });
    let html = `<!DOCTYPE html><html lang="en"><head><title>Svelte app</title></head><body></body></html>`;
    await page.setContent(html);
    page.evaluate(output.output[0].code);
    const result = await page.content();
    t.snapshot(result);
});

test(
    "test4e options - alwaysSave defaults to false, file won't save if contains same list of icons",
    withPage,
    async (t, page) => {
        const full_output_path = path.join(__dirname, "./outputs/test4e.js");

        //first run
        await del([full_output_path]);
        const bundle1 = await rollup({
            input: "./test/fixtures/test1/test.js",
            plugins: [
                rolluppluginiconifysvg({
                    targets: [{ src: "./test/fixtures/test1", dest: "./test/outputs/test4e.js" }],
                    commonJs: true, // allows output file to be required below
                }),
            ],
        });
        await bundle1.generate({ format: "cjs" });
        const before_date = fs.statSync(full_output_path);

        //second run
        const bundle2 = await rollup({
            input: "./test/fixtures/test1/test.js",
            plugins: [
                rolluppluginiconifysvg({
                    targets: [{ src: "./test/fixtures/test1", dest: "./test/outputs/test4e.js" }],
                    commonJs: true, // allows output file to be required below
                }),
            ],
        });
        await bundle1.generate({ format: "cjs" });
        const after_date = fs.statSync(full_output_path);

        //result
        const result = {
            match: before_date.mtime === after_date.mtime,
        };
        t.snapshot(result);
    }
);

test("test4f options - alwaysSave = true will overwrite file even if identical", withPage, async (t, page) => {
    const full_output_path = path.join(__dirname, "./outputs/test4f.js");

    //first run
    await del([full_output_path]);
    const bundle1 = await rollup({
        input: "./test/fixtures/test1/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test1", dest: "./test/outputs/test4f.js" }],
                commonJs: true, // allows output file to be required below
            }),
        ],
    });
    await bundle1.generate({ format: "cjs" });
    const before_date = fs.statSync(full_output_path);

    //second run
    const bundle2 = await rollup({
        input: "./test/fixtures/test1/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test1", dest: "./test/outputs/test4f.js" }],
                commonJs: true, // allows output file to be required below
                alwaysSave: true,
            }),
        ],
    });
    await bundle1.generate({ format: "cjs" });
    const after_date = fs.statSync(full_output_path);

    //result
    const result = {
        should_not_match: before_date.mtime !== after_date.mtime,
    };
    t.snapshot(result);
});

test(
    "test5a options - recursive = true will search recursively within input directories",
    withPage,
    async (t, page) => {
        const full_output_path = path.join(__dirname, "./outputs/test5a.js");

        //first run
        await del([full_output_path]);
        const bundle = await rollup({
            input: "./test/fixtures/test5/test.js",
            plugins: [
                rolluppluginiconifysvg({
                    targets: [{ src: "./test/fixtures/test5", dest: "./test/outputs/test5a.js" }],
                    recursive: true,
                    commonJs: true, // allows output file to be required below
                }),
            ],
        });
        await bundle.generate({ format: "cjs" });
        const icons = require("./outputs/test5a.js");
        t.snapshot(icons);
    }
);

test("test5b options - recursive = false will only search within input directories", withPage, async (t, page) => {
    const full_output_path = path.join(__dirname, "./outputs/test5b.js");

    //first run
    await del([full_output_path]);
    const bundle = await rollup({
        input: "./test/fixtures/test5/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test5", dest: "./test/outputs/test5b.js" }],
                recursive: false,
                commonJs: true, // allows output file to be required below
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("./outputs/test5b.js");
    t.snapshot(icons);
});

test("test5c options - recursive missing will only search within input directories", withPage, async (t, page) => {
    const full_output_path = path.join(__dirname, "./outputs/test5c.js");

    //first run
    await del([full_output_path]);
    const bundle = await rollup({
        input: "./test/fixtures/test5/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test5", dest: "./test/outputs/test5c.js" }],
                commonJs: true, // allows output file to be required below
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("./outputs/test5c.js");
    t.snapshot(icons);
});

test("test 13a fn - option transform [default=false] - check that g transform is NOT included for fa hFLip and vFlip examples by default", async (t) => {
    const bundle = await rollup({
        input: "./test/fixtures/test13/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test13", dest: "./test/outputs/test13/test13a.js" }],
                commonJs: true, // allows output file to be required below
                alwaysSave: true,
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("./outputs/test13/test13a.js");
    t.snapshot(icons);
});

test("test 13b fn - option transform = false - check that g transform is NOT included for fa hFLip and vFlip examples", async (t) => {
    const bundle = await rollup({
        input: "./test/fixtures/test13/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test13", dest: "./test/outputs/test13/test13b.js" }],
                commonJs: true, // allows output file to be required below
                alwaysSave: true,
                transform: false,
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("./outputs/test13/test13b.js");
    t.snapshot(icons);
});

test("test 13c fn - option transform = true - check that g transform IS included for fa hFLip and vFlip examples", async (t) => {
    const bundle = await rollup({
        input: "./test/fixtures/test13/test.js",
        plugins: [
            rolluppluginiconifysvg({
                targets: [{ src: "./test/fixtures/test13", dest: "./test/outputs/test13/test13c.js" }],
                commonJs: true, // allows output file to be required below
                alwaysSave: true,
                transform: true,
            }),
        ],
    });
    await bundle.generate({ format: "cjs" });
    const icons = require("./outputs/test13/test13c.js");
    t.snapshot(icons);
});
