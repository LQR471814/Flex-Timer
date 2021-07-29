
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Svg\Plus.svelte generated by Svelte v3.38.3 */

    const file$g = "src\\Svg\\Plus.svelte";

    function create_fragment$g(ctx) {
    	let svg;
    	let rect0;
    	let rect1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			attr_dev(rect0, "class", "plus-symbol svelte-10zmx06");
    			attr_dev(rect0, "x", "45");
    			attr_dev(rect0, "y", "15");
    			attr_dev(rect0, "width", "11");
    			attr_dev(rect0, "height", "67");
    			attr_dev(rect0, "rx", "5.5");
    			attr_dev(rect0, "transform", "translate(2 99) rotate(-90)");
    			add_location(rect0, file$g, 4, 1, 128);
    			attr_dev(rect1, "class", "plus-symbol svelte-10zmx06");
    			attr_dev(rect1, "x", "45");
    			attr_dev(rect1, "y", "15");
    			attr_dev(rect1, "width", "11");
    			attr_dev(rect1, "height", "67");
    			attr_dev(rect1, "rx", "5.5");
    			add_location(rect1, file$g, 5, 1, 245);
    			attr_dev(svg, "style", /*style*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 100 100");
    			attr_dev(svg, "class", "svelte-10zmx06");
    			add_location(svg, file$g, 3, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, rect0);
    			append_dev(svg, rect1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*style*/ 1) {
    				attr_dev(svg, "style", /*style*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Plus", slots, []);
    	let { style = "" } = $$props;
    	const writable_props = ["style"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Plus> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    	};

    	$$self.$capture_state = () => ({ style });

    	$$self.$inject_state = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [style];
    }

    class Plus extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { style: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Plus",
    			options,
    			id: create_fragment$g.name
    		});
    	}

    	get style() {
    		throw new Error("<Plus>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Plus>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Main\PlusButton.svelte generated by Svelte v3.38.3 */
    const file$f = "src\\Main\\PlusButton.svelte";

    function create_fragment$f(ctx) {
    	let div1;
    	let div0;
    	let plus;
    	let current;
    	let mounted;
    	let dispose;
    	plus = new Plus({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(plus.$$.fragment);
    			attr_dev(div0, "class", "plus-container svelte-1m4ehfo");
    			add_location(div0, file$f, 6, 1, 189);
    			attr_dev(div1, "class", "plus-root svelte-1m4ehfo");
    			add_location(div1, file$f, 5, 0, 163);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(plus, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(plus.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(plus.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(plus);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PlusButton", slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PlusButton> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		dispatch("click");
    	};

    	$$self.$capture_state = () => ({ createEventDispatcher, Plus, dispatch });
    	return [dispatch, click_handler];
    }

    class PlusButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PlusButton",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src\Svg\PlayButton.svelte generated by Svelte v3.38.3 */

    const file$e = "src\\Svg\\PlayButton.svelte";

    // (16:0) {:else}
    function create_else_block$1(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(path0, "class", "svg-fill-accent");
    			attr_dev(path0, "d", "M540,1030A490.14,490.14,0,0,1,349.29,88.49a490.13,490.13,0,0,1,381.42,903A486.8,486.8,0,0,1,540,1030Z");
    			add_location(path0, file$e, 18, 1, 1284);
    			attr_dev(path1, "class", "svg-fill-accent");
    			attr_dev(path1, "d", "M540,100A440.14,440.14,0,0,1,711.24,945.46,440.14,440.14,0,0,1,368.76,134.54,437.12,437.12,0,0,1,540,100M540,0C241.77,0,0,241.77,0,540s241.77,540,540,540,540-241.77,540-540S838.23,0,540,0Z");
    			add_location(path1, file$e, 19, 1, 1424);
    			attr_dev(path2, "class", "svg-fill-play-btn-background play-button-stroke svelte-1tpizh5");
    			attr_dev(path2, "d", "M761.74,537.29l-322.24-186a3.33,3.33,0,0,0-5,2.88v372.1a3.33,3.33,0,0,0,5,2.88l322.24-186A3.34,3.34,0,0,0,761.74,537.29Z");
    			add_location(path2, file$e, 20, 1, 1651);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 1080 1080");
    			attr_dev(svg, "style", /*style*/ ctx[1]);
    			attr_dev(svg, "class", "svelte-1tpizh5");
    			add_location(svg, file$e, 17, 0, 1209);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*style*/ 2) {
    				attr_dev(svg, "style", /*style*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(16:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (5:0) {#if active === true}
    function create_if_block$2(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			attr_dev(path0, "class", "svg-fill-play-btn-background");
    			attr_dev(path0, "d", "M540,1030A490.14,490.14,0,0,1,349.29,88.49a490.13,490.13,0,0,1,381.42,903A486.8,486.8,0,0,1,540,1030Z");
    			add_location(path0, file$e, 7, 1, 183);
    			attr_dev(path1, "class", "svg-fill-accent");
    			attr_dev(path1, "d", "M540,100A440.14,440.14,0,0,1,711.24,945.46,440.14,440.14,0,0,1,368.76,134.54,437.12,437.12,0,0,1,540,100M540,0C241.77,0,0,241.77,0,540s241.77,540,540,540,540-241.77,540-540S838.23,0,540,0Z");
    			add_location(path1, file$e, 8, 1, 336);
    			attr_dev(path2, "class", "svg-fill-play-btn-background");
    			attr_dev(path2, "d", "M419.72,760.19A16.44,16.44,0,0,1,403.5,744V362.72a16.22,16.22,0,1,1,32.43,0V744A16.43,16.43,0,0,1,419.72,760.19Z");
    			add_location(path2, file$e, 9, 1, 563);
    			attr_dev(path3, "class", "svg-fill-accent");
    			attr_dev(path3, "d", "M419.72,309A53.87,53.87,0,0,0,366,362.72V744a53.72,53.72,0,1,0,107.43,0V362.72A53.87,53.87,0,0,0,419.72,309Z");
    			add_location(path3, file$e, 10, 1, 727);
    			attr_dev(path4, "class", "svg-fill-play-btn-background");
    			attr_dev(path4, "d", "M660.79,761.5a16.44,16.44,0,0,1-16.22-16.22V364A16.22,16.22,0,1,1,677,364V745.28A16.43,16.43,0,0,1,660.79,761.5Z");
    			add_location(path4, file$e, 11, 1, 874);
    			attr_dev(path5, "class", "svg-fill-accent");
    			attr_dev(path5, "d", "M660.79,310.31A53.87,53.87,0,0,0,607.07,364V745.28a53.72,53.72,0,1,0,107.43,0V364a53.87,53.87,0,0,0-53.71-53.72Z");
    			add_location(path5, file$e, 12, 1, 1038);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 1080 1080");
    			attr_dev(svg, "style", /*style*/ ctx[1]);
    			attr_dev(svg, "class", "svelte-1tpizh5");
    			add_location(svg, file$e, 6, 0, 108);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			append_dev(svg, path3);
    			append_dev(svg, path4);
    			append_dev(svg, path5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*style*/ 2) {
    				attr_dev(svg, "style", /*style*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(5:0) {#if active === true}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$e(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*active*/ ctx[0] === true) return create_if_block$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PlayButton", slots, []);
    	let { active = false } = $$props;
    	let { style = "" } = $$props;
    	const writable_props = ["active", "style"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PlayButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    	};

    	$$self.$capture_state = () => ({ active, style });

    	$$self.$inject_state = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("style" in $$props) $$invalidate(1, style = $$props.style);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [active, style];
    }

    class PlayButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { active: 0, style: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PlayButton",
    			options,
    			id: create_fragment$e.name
    		});
    	}

    	get active() {
    		throw new Error("<PlayButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<PlayButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<PlayButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<PlayButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Timer\ControlButton.svelte generated by Svelte v3.38.3 */
    const file$d = "src\\Timer\\ControlButton.svelte";

    function create_fragment$d(ctx) {
    	let div1;
    	let div0;
    	let playbutton;
    	let current;
    	let mounted;
    	let dispose;

    	playbutton = new PlayButton({
    			props: {
    				active: /*active*/ ctx[0] > 0 ? true : false
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(playbutton.$$.fragment);
    			attr_dev(div0, "class", "svelte-1l18rkc");
    			add_location(div0, file$d, 7, 1, 240);
    			attr_dev(div1, "class", "timer-control-container svelte-1l18rkc");
    			add_location(div1, file$d, 6, 0, 200);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(playbutton, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const playbutton_changes = {};
    			if (dirty & /*active*/ 1) playbutton_changes.active = /*active*/ ctx[0] > 0 ? true : false;
    			playbutton.$set(playbutton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(playbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(playbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(playbutton);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ControlButton", slots, []);
    	let { active = -1 } = $$props;
    	const dispatch = createEventDispatcher();
    	const writable_props = ["active"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ControlButton> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		$$invalidate(0, active *= -1);
    		dispatch("click", { active });
    	};

    	$$self.$$set = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    	};

    	$$self.$capture_state = () => ({
    		PlayButton,
    		createEventDispatcher,
    		active,
    		dispatch
    	});

    	$$self.$inject_state = $$props => {
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [active, dispatch, click_handler];
    }

    class ControlButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { active: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ControlButton",
    			options,
    			id: create_fragment$d.name
    		});
    	}

    	get active() {
    		throw new Error("<ControlButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<ControlButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const numberRe = new RegExp('^[0-9]+$');
    const isNumber = (n) => {
        return numberRe.test(n);
    };

    function numberOnly(currentText) {
        if (isNumber(currentText))
            return true;
    }

    /* src\Common\Editable\Editable.svelte generated by Svelte v3.38.3 */
    const file$c = "src\\Common\\Editable\\Editable.svelte";

    function create_fragment$c(ctx) {
    	let span_1;
    	let span_1_contenteditable_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span_1 = element("span");
    			attr_dev(span_1, "style", /*style*/ ctx[0]);
    			attr_dev(span_1, "contenteditable", span_1_contenteditable_value = /*disabled*/ ctx[1] ? false : true);
    			add_location(span_1, file$c, 24, 0, 709);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span_1, anchor);
    			/*span_1_binding*/ ctx[6](span_1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span_1, "blur", /*onedit*/ ctx[3], false, false, false),
    					listen_dev(span_1, "keydown", /*keydown_handler*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*style*/ 1) {
    				attr_dev(span_1, "style", /*style*/ ctx[0]);
    			}

    			if (dirty & /*disabled*/ 2 && span_1_contenteditable_value !== (span_1_contenteditable_value = /*disabled*/ ctx[1] ? false : true)) {
    				attr_dev(span_1, "contenteditable", span_1_contenteditable_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span_1);
    			/*span_1_binding*/ ctx[6](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Editable", slots, []);
    	const dispatch = createEventDispatcher();

    	const onedit = () => {
    		const previousText = text;
    		let currentText = span.innerText;

    		if (beforeEdit(currentText)) {
    			dispatch("edit", currentText);
    			$$invalidate(2, span.innerText = currentText, span); //? Force update
    			return;
    		}

    		$$invalidate(2, span.innerText = previousText, span);
    	};

    	afterUpdate(() => {
    		//? I have to use innerText to set values since
    		//? contenteditable will override svelte's render
    		$$invalidate(2, span.innerText = text, span);
    	});

    	let { text } = $$props;
    	let { style = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { beforeEdit = () => true } = $$props;
    	let span;
    	const writable_props = ["text", "style", "disabled", "beforeEdit"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Editable> was created with unknown prop '${key}'`);
    	});

    	function span_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			span = $$value;
    			$$invalidate(2, span);
    		});
    	}

    	const keydown_handler = e => {
    		if (e.code === "Enter") {
    			e.preventDefault();
    			span.blur();
    			onedit();
    		}
    	};

    	$$self.$$set = $$props => {
    		if ("text" in $$props) $$invalidate(4, text = $$props.text);
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("beforeEdit" in $$props) $$invalidate(5, beforeEdit = $$props.beforeEdit);
    	};

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		createEventDispatcher,
    		dispatch,
    		onedit,
    		text,
    		style,
    		disabled,
    		beforeEdit,
    		span
    	});

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(4, text = $$props.text);
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("beforeEdit" in $$props) $$invalidate(5, beforeEdit = $$props.beforeEdit);
    		if ("span" in $$props) $$invalidate(2, span = $$props.span);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		style,
    		disabled,
    		span,
    		onedit,
    		text,
    		beforeEdit,
    		span_1_binding,
    		keydown_handler
    	];
    }

    class Editable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			text: 4,
    			style: 0,
    			disabled: 1,
    			beforeEdit: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editable",
    			options,
    			id: create_fragment$c.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*text*/ ctx[4] === undefined && !("text" in props)) {
    			console.warn("<Editable> was created without expected prop 'text'");
    		}
    	}

    	get text() {
    		throw new Error("<Editable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Editable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Editable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Editable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Editable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Editable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get beforeEdit() {
    		throw new Error("<Editable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set beforeEdit(value) {
    		throw new Error("<Editable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Timer\Clock.svelte generated by Svelte v3.38.3 */

    const { Error: Error_1 } = globals;
    const file$b = "src\\Timer\\Clock.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (64:2) {:else}
    function create_else_block(ctx) {
    	let editable;
    	let current;

    	function edit_handler(...args) {
    		return /*edit_handler*/ ctx[7](/*element*/ ctx[12], ...args);
    	}

    	editable = new Editable({
    			props: {
    				text: /*element*/ ctx[12].value,
    				beforeEdit: numberOnly,
    				disabled: /*lengthEditDisabled*/ ctx[0],
    				style: editableStyle
    			},
    			$$inline: true
    		});

    	editable.$on("edit", edit_handler);

    	const block = {
    		c: function create() {
    			create_component(editable.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editable, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const editable_changes = {};
    			if (dirty & /*renderedTime*/ 2) editable_changes.text = /*element*/ ctx[12].value;
    			if (dirty & /*lengthEditDisabled*/ 1) editable_changes.disabled = /*lengthEditDisabled*/ ctx[0];
    			editable.$set(editable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editable, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(64:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (62:2) {#if element === 'SEPERATOR'}
    function create_if_block$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = ":";
    			attr_dev(span, "class", "svelte-j62cie");
    			add_location(span, file$b, 62, 3, 1944);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(62:2) {#if element === 'SEPERATOR'}",
    		ctx
    	});

    	return block;
    }

    // (61:1) {#each join(renderedTime, 'SEPERATOR') as element}
    function create_each_block$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*element*/ ctx[12] === "SEPERATOR") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(61:1) {#each join(renderedTime, 'SEPERATOR') as element}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div;
    	let current;
    	let each_value = /*join*/ ctx[4](/*renderedTime*/ ctx[1], "SEPERATOR");
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "svelte-j62cie");
    			add_location(div, file$b, 59, 0, 1848);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*join, renderedTime, numberOnly, lengthEditDisabled, editableStyle, parseInt, dispatch, timeToSeconds*/ 31) {
    				each_value = /*join*/ ctx[4](/*renderedTime*/ ctx[1], "SEPERATOR");
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const digitCount = 2;
    const editableStyle = "font-size: 35px;";
    const second = 1;

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Clock", slots, []);
    	let { currentTime } = $$props;
    	let { active } = $$props;
    	let lengthEditDisabled = true;
    	let renderedTime = [];
    	const dispatch = createEventDispatcher();
    	const minute = 60 * second;
    	const hour = 60 * minute;

    	const secondsToTime = time => {
    		const hours = Math.floor(time / Math.pow(60, 2));
    		const hourRemainder = time % Math.pow(60, 2);
    		const minutes = Math.floor(hourRemainder / 60);
    		const minuteRemainder = hourRemainder % 60;
    		const seconds = Math.floor(minuteRemainder);
    		return [hours, minutes, seconds];
    	};

    	const timeToSeconds = (hours, minutes, seconds) => {
    		return hours * hour + minutes * minute + seconds * second;
    	};

    	const fitDigit = (n, digits) => {
    		let result = n.toString();

    		if (result.length > digits) {
    			throw new Error("Number has more digits than target digit amount");
    		}

    		for (let i = 0; i < digits - result.length; i++) {
    			result = "0" + result;
    		}

    		return result;
    	};

    	/* Utility */
    	const join = (arr, seperator) => {
    		const result = [];

    		for (const element of arr) {
    			result.push(element);
    			if (result.length <= arr.length) result.push(seperator);
    		}

    		return result;
    	};

    	const writable_props = ["currentTime", "active"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Clock> was created with unknown prop '${key}'`);
    	});

    	const edit_handler = (element, e) => {
    		const dispatchTime = [];

    		for (const timeFragment of renderedTime) {
    			if (element.type === timeFragment.type) {
    				dispatchTime.push(e.detail);
    				continue;
    			}

    			dispatchTime.push(parseInt(timeFragment.value));
    		}

    		dispatch("edit", timeToSeconds(dispatchTime[0], dispatchTime[1], dispatchTime[2]));
    	};

    	$$self.$$set = $$props => {
    		if ("currentTime" in $$props) $$invalidate(5, currentTime = $$props.currentTime);
    		if ("active" in $$props) $$invalidate(6, active = $$props.active);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		numberOnly,
    		Editable,
    		currentTime,
    		active,
    		lengthEditDisabled,
    		renderedTime,
    		dispatch,
    		digitCount,
    		editableStyle,
    		second,
    		minute,
    		hour,
    		secondsToTime,
    		timeToSeconds,
    		fitDigit,
    		join
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentTime" in $$props) $$invalidate(5, currentTime = $$props.currentTime);
    		if ("active" in $$props) $$invalidate(6, active = $$props.active);
    		if ("lengthEditDisabled" in $$props) $$invalidate(0, lengthEditDisabled = $$props.lengthEditDisabled);
    		if ("renderedTime" in $$props) $$invalidate(1, renderedTime = $$props.renderedTime);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*active, currentTime*/ 96) {
    			{
    				$$invalidate(0, lengthEditDisabled = active > 0);
    				const time = secondsToTime(currentTime).map(val => fitDigit(val, digitCount));

    				$$invalidate(1, renderedTime = [
    					{ type: "hour", value: time[0] },
    					{ type: "minute", value: time[1] },
    					{ type: "second", value: time[2] }
    				]);
    			}
    		}
    	};

    	return [
    		lengthEditDisabled,
    		renderedTime,
    		dispatch,
    		timeToSeconds,
    		join,
    		currentTime,
    		active,
    		edit_handler
    	];
    }

    class Clock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { currentTime: 5, active: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Clock",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*currentTime*/ ctx[5] === undefined && !("currentTime" in props)) {
    			console.warn("<Clock> was created without expected prop 'currentTime'");
    		}

    		if (/*active*/ ctx[6] === undefined && !("active" in props)) {
    			console.warn("<Clock> was created without expected prop 'active'");
    		}
    	}

    	get currentTime() {
    		throw new Error_1("<Clock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentTime(value) {
    		throw new Error_1("<Clock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error_1("<Clock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error_1("<Clock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function setID(val, prefix, value) {
        const newState = Object.assign({}, val);
        if (value) {
            newState.ids[prefix] = value;
            return newState;
        }
        if (!Object.keys(newState.ids).includes(prefix))
            newState.ids[prefix] = 0;
        newState.ids[prefix]++;
        return newState;
    }
    function generateID(val, prefix) {
        setID(val, prefix);
        return `${prefix}_${val.ids[prefix]}`;
    }
    function defaultState() {
        return {
            timers: {},
            ids: {}
        };
    }
    function defaultTimer(n) {
        return {
            name: `Timer ${n}`,
            length: 60,
            currentTime: 60,
            active: -1
        };
    }

    const storedTheme = localStorage.getItem('state');
    const state = writable(storedTheme ?
        JSON.parse(storedTheme) :
        defaultState());
    let defaultTimerNumber = 0;
    let currentStateAsJSON;
    state.subscribe(val => {
        currentStateAsJSON = toJSON(val);
        localStorage.setItem('state', currentStateAsJSON);
    });
    function toJSON(val) {
        return JSON.stringify(Object.assign(Object.assign({}, val), { type: "state" }));
    }
    function exportState() {
        return new Blob([currentStateAsJSON], { type: 'text/json' });
    }
    function refreshTimers(val) {
        const newState = Object.assign({}, val);
        for (const timer of Object.values(newState.timers)) {
            timer.currentTime = timer.length;
            timer.active = -1;
        }
        return newState;
    }
    function addDefaultTimer(val) {
        defaultTimerNumber++;
        const newState = Object.assign({}, val);
        newState.timers[generateID(val, 'Timer')] = defaultTimer(defaultTimerNumber);
        return newState;
    }
    function editTimerLength(val, timerID, length) {
        const newState = Object.assign({}, val);
        const timer = newState.timers[timerID];
        if (timer.currentTime === timer.length)
            timer.currentTime = length;
        timer.length = length;
        return newState;
    }
    function editTimerTitle(val, timerID, title) {
        const newState = Object.assign({}, val);
        newState.timers[timerID].name = title;
        return newState;
    }
    function removeTimer(val, timerID) {
        const newState = Object.assign({}, val);
        delete newState.timers[timerID];
        return newState;
    }
    function decrementTimer(val, timerID) {
        const newState = Object.assign({}, val);
        const timer = newState.timers[timerID];
        if (timer.currentTime === 0) {
            timer.active = -1;
            timer.currentTime = timer.length;
            return newState;
        }
        timer.currentTime--;
        return newState;
    }
    function controlTimer(val, timerID, active) {
        const newState = Object.assign({}, val);
        const timer = newState.timers[timerID];
        timer.active = active;
        return newState;
    }

    /* src\Timer\Timer.svelte generated by Svelte v3.38.3 */
    const file$a = "src\\Timer\\Timer.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let clock_1;
    	let t0;
    	let editable;
    	let t1;
    	let button;
    	let current;

    	clock_1 = new Clock({
    			props: {
    				active: /*active*/ ctx[2],
    				currentTime: /*currentTime*/ ctx[3]
    			},
    			$$inline: true
    		});

    	clock_1.$on("edit", /*edit_handler*/ ctx[4]);

    	editable = new Editable({
    			props: {
    				text: /*name*/ ctx[1],
    				disabled: /*active*/ ctx[2] > 0,
    				style: "max-width: 70%;"
    			},
    			$$inline: true
    		});

    	editable.$on("edit", /*edit_handler_1*/ ctx[5]);

    	button = new ControlButton({
    			props: { active: /*active*/ ctx[2] },
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(clock_1.$$.fragment);
    			t0 = space();
    			create_component(editable.$$.fragment);
    			t1 = space();
    			create_component(button.$$.fragment);
    			attr_dev(div, "class", "svelte-9f91mm");
    			add_location(div, file$a, 16, 0, 567);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(clock_1, div, null);
    			append_dev(div, t0);
    			mount_component(editable, div, null);
    			append_dev(div, t1);
    			mount_component(button, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const clock_1_changes = {};
    			if (dirty & /*active*/ 4) clock_1_changes.active = /*active*/ ctx[2];
    			if (dirty & /*currentTime*/ 8) clock_1_changes.currentTime = /*currentTime*/ ctx[3];
    			clock_1.$set(clock_1_changes);
    			const editable_changes = {};
    			if (dirty & /*name*/ 2) editable_changes.text = /*name*/ ctx[1];
    			if (dirty & /*active*/ 4) editable_changes.disabled = /*active*/ ctx[2] > 0;
    			editable.$set(editable_changes);
    			const button_changes = {};
    			if (dirty & /*active*/ 4) button_changes.active = /*active*/ ctx[2];
    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(clock_1.$$.fragment, local);
    			transition_in(editable.$$.fragment, local);
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(clock_1.$$.fragment, local);
    			transition_out(editable.$$.fragment, local);
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(clock_1);
    			destroy_component(editable);
    			destroy_component(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Timer", slots, []);
    	let { id } = $$props;
    	let { name } = $$props;
    	let { active } = $$props;
    	let { currentTime } = $$props;

    	const clock = setInterval(
    		() => {
    			if (active > 0) state.update(state => decrementTimer(state, id));
    		},
    		1000
    	);

    	onMount(() => () => clearInterval(clock));
    	const writable_props = ["id", "name", "active", "currentTime"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timer> was created with unknown prop '${key}'`);
    	});

    	const edit_handler = e => {
    		state.update(state => editTimerLength(state, id, e.detail));
    	};

    	const edit_handler_1 = e => {
    		state.update(state => editTimerTitle(state, id, e.detail));
    	};

    	const click_handler = e => {
    		state.update(state => controlTimer(state, id, e.detail.active));
    	};

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("active" in $$props) $$invalidate(2, active = $$props.active);
    		if ("currentTime" in $$props) $$invalidate(3, currentTime = $$props.currentTime);
    	};

    	$$self.$capture_state = () => ({
    		Button: ControlButton,
    		Clock,
    		Editable,
    		controlTimer,
    		decrementTimer,
    		editTimerLength,
    		editTimerTitle,
    		state,
    		onMount,
    		id,
    		name,
    		active,
    		currentTime,
    		clock
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("active" in $$props) $$invalidate(2, active = $$props.active);
    		if ("currentTime" in $$props) $$invalidate(3, currentTime = $$props.currentTime);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, name, active, currentTime, edit_handler, edit_handler_1, click_handler];
    }

    class Timer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			id: 0,
    			name: 1,
    			active: 2,
    			currentTime: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timer",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !("id" in props)) {
    			console.warn("<Timer> was created without expected prop 'id'");
    		}

    		if (/*name*/ ctx[1] === undefined && !("name" in props)) {
    			console.warn("<Timer> was created without expected prop 'name'");
    		}

    		if (/*active*/ ctx[2] === undefined && !("active" in props)) {
    			console.warn("<Timer> was created without expected prop 'active'");
    		}

    		if (/*currentTime*/ ctx[3] === undefined && !("currentTime" in props)) {
    			console.warn("<Timer> was created without expected prop 'currentTime'");
    		}
    	}

    	get id() {
    		throw new Error("<Timer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Timer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Timer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Timer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Timer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Timer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentTime() {
    		throw new Error("<Timer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentTime(value) {
    		throw new Error("<Timer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Svg\TrashCan.svelte generated by Svelte v3.38.3 */

    const file$9 = "src\\Svg\\TrashCan.svelte";

    function create_fragment$9(ctx) {
    	let svg;
    	let g0;
    	let path0;
    	let path1;
    	let g1;
    	let line0;
    	let line1;
    	let line2;
    	let g2;
    	let path2;
    	let rect;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			g1 = svg_element("g");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			g2 = svg_element("g");
    			path2 = svg_element("path");
    			rect = svg_element("rect");
    			attr_dev(path0, "class", "svg-fill-transparent");
    			attr_dev(path0, "d", "M68,293c-3.86,0-6.25-1.44-6.82-2.07L12.55,99.6A11,11,0,0,1,19,97.85H252.31a11,11,0,0,1,6.46,1.75L210.2,290.93c-.58.63-3,2.07-6.83,2.07Z");
    			attr_dev(path0, "transform", "translate(0 0)");
    			add_location(path0, file$9, 5, 2, 172);
    			attr_dev(path1, "class", "trash-can-fill svelte-jx4ipv");
    			attr_dev(path1, "d", "M246.36,107.85,201.89,283H69.51L25,107.85H246.36M17.92,108h0M252.31,87.85H19C8.68,87.85.83,94.1,2.57,100.94l49,192.74C53,299.06,59.91,303,68,303H203.37c8.13,0,15.08-3.94,16.44-9.32l48.94-192.74c1.74-6.84-6.11-13.09-16.44-13.09Z");
    			attr_dev(path1, "transform", "translate(0 0)");
    			add_location(path1, file$9, 6, 2, 379);
    			attr_dev(g0, "id", "Body");
    			add_location(g0, file$9, 4, 1, 155);
    			attr_dev(line0, "class", "trash-stroke svelte-jx4ipv");
    			attr_dev(line0, "x1", "193.22");
    			attr_dev(line0, "y1", "146.91");
    			attr_dev(line0, "x2", "177.56");
    			attr_dev(line0, "y2", "246.5");
    			add_location(line0, file$9, 9, 2, 696);
    			attr_dev(line1, "class", "trash-stroke svelte-jx4ipv");
    			attr_dev(line1, "x1", "136.5");
    			attr_dev(line1, "y1", "147.2");
    			attr_dev(line1, "x2", "136.35");
    			attr_dev(line1, "y2", "246.81");
    			add_location(line1, file$9, 10, 2, 775);
    			attr_dev(line2, "class", "trash-stroke svelte-jx4ipv");
    			attr_dev(line2, "x1", "78.77");
    			attr_dev(line2, "y1", "147.62");
    			attr_dev(line2, "x2", "94.35");
    			attr_dev(line2, "y2", "247.07");
    			add_location(line2, file$9, 11, 2, 853);
    			attr_dev(g1, "id", "Lines");
    			add_location(g1, file$9, 8, 1, 678);
    			attr_dev(path2, "class", "trash-stroke svelte-jx4ipv");
    			attr_dev(path2, "d", "M34,44H237a24,24,0,0,1,24,24V82a6,6,0,0,1-6,6H16a6,6,0,0,1-6-6V68A24,24,0,0,1,34,44Z");
    			add_location(path2, file$9, 14, 2, 953);
    			attr_dev(rect, "class", "trash-stroke svelte-jx4ipv");
    			attr_dev(rect, "x", "100");
    			attr_dev(rect, "y", "10");
    			attr_dev(rect, "width", "72");
    			attr_dev(rect, "height", "34");
    			attr_dev(rect, "rx", "12");
    			add_location(rect, file$9, 15, 2, 1074);
    			attr_dev(g2, "id", "Lid");
    			add_location(g2, file$9, 13, 1, 937);
    			set_style(svg, "--fill", /*fill*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 271 303");
    			attr_dev(svg, "class", "svelte-jx4ipv");
    			add_location(svg, file$9, 3, 0, 67);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g0);
    			append_dev(g0, path0);
    			append_dev(g0, path1);
    			append_dev(svg, g1);
    			append_dev(g1, line0);
    			append_dev(g1, line1);
    			append_dev(g1, line2);
    			append_dev(svg, g2);
    			append_dev(g2, path2);
    			append_dev(g2, rect);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fill*/ 1) {
    				set_style(svg, "--fill", /*fill*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TrashCan", slots, []);
    	let { fill = "var(--accent)" } = $$props;
    	const writable_props = ["fill"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TrashCan> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	$$self.$capture_state = () => ({ fill });

    	$$self.$inject_state = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fill];
    }

    class TrashCan extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { fill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TrashCan",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get fill() {
    		throw new Error("<TrashCan>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<TrashCan>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Main\Close.svelte generated by Svelte v3.38.3 */
    const file$8 = "src\\Main\\Close.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let trash;
    	let current;
    	let mounted;
    	let dispose;
    	trash = new TrashCan({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(trash.$$.fragment);
    			attr_dev(div, "class", "close-root svelte-6jbcki");
    			add_location(div, file$8, 5, 0, 156);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(trash, div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(trash.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(trash.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(trash);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Close", slots, []);
    	let { id = "" } = $$props;
    	const writable_props = ["id"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Close> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => state.update(state => removeTimer(state, id));

    	$$self.$$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    	};

    	$$self.$capture_state = () => ({ removeTimer, state, Trash: TrashCan, id });

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, click_handler];
    }

    class Close extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { id: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Close",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get id() {
    		throw new Error("<Close>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Close>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src\Common\Menu.svelte generated by Svelte v3.38.3 */
    const file$7 = "src\\Common\\Menu.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (6:1) {#each items as item}
    function create_each_block$1(ctx) {
    	let div1;
    	let div0;
    	let switch_instance;
    	let t0;
    	let span;
    	let t1_value = /*item*/ ctx[2].text + "";
    	let t1;
    	let t2;
    	let current;
    	let mounted;
    	let dispose;
    	var switch_value = /*item*/ ctx[2].icon;

    	function switch_props(ctx) {
    		return {
    			props: { fill: "var(--config-color)" },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	function click_handler() {
    		return /*click_handler*/ ctx[1](/*item*/ ctx[2]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(div0, "class", "item-svg svelte-by8a6i");
    			add_location(div0, file$7, 11, 3, 255);
    			attr_dev(span, "class", "svelte-by8a6i");
    			add_location(span, file$7, 15, 3, 365);
    			attr_dev(div1, "class", "menu-item svelte-by8a6i");
    			add_location(div1, file$7, 6, 2, 173);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			if (switch_instance) {
    				mount_component(switch_instance, div0, null);
    			}

    			append_dev(div1, t0);
    			append_dev(div1, span);
    			append_dev(span, t1);
    			append_dev(div1, t2);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (switch_value !== (switch_value = /*item*/ ctx[2].icon)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div0, null);
    				} else {
    					switch_instance = null;
    				}
    			}

    			if ((!current || dirty & /*items*/ 1) && t1_value !== (t1_value = /*item*/ ctx[2].text + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(6:1) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div;
    	let div_transition;
    	let current;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "menu-root svelte-by8a6i");
    			add_location(div, file$7, 4, 0, 97);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items*/ 1) {
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: 20 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: 20 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Menu", slots, []);
    	let { items = [] } = $$props;
    	const writable_props = ["items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	const click_handler = item => {
    		item.callback();
    	};

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	$$self.$capture_state = () => ({ fly, items });

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [items, click_handler];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get items() {
    		throw new Error("<Menu>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<Menu>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Svg\Gear.svelte generated by Svelte v3.38.3 */

    const file$6 = "src\\Svg\\Gear.svelte";

    function create_fragment$6(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M111.17,50.32c9.86-2.21,17.73,1.81,25.29,7.6,6.08,4.65,12.54,8.82,19,12.86a7.28,7.28,0,0,0,5.69.35q13.92-5.44,27.57-11.57a7,7,0,0,0,3.15-4.37c2.51-10.69,4.64-21.47,7.15-32.16a13.82,13.82,0,0,1,3.2-6c4.53-4.88,9.21-9.65,14.15-14.11A10.7,10.7,0,0,1,222.84.25q29.25-.31,58.5,0c2.05,0,4.1,1.51,6.14,2.36.29.12.45.5.73.68,16.28,10.8,19.77,27.81,21.55,45.39.76,7.56,3.56,11.68,11.32,13.65,7,1.78,13.55,5.47,20.09,8.73,2.81,1.4,4.71,1.18,7.18-.56,8.73-6.12,17.54-12.12,26.48-17.92a15.82,15.82,0,0,1,6.89-2.15c3.64-.36,7.39.35,11-.18,8.57-1.28,14.58,2,20.39,8.28,11.4,12.36,23.73,23.87,35.45,35.94a13,13,0,0,1,2.93,6.89c2.45,16.17-1.64,30.39-12.67,42.72-3.63,4.05-8.19,8.88-8.64,13.7s3.87,9.87,5.93,14.9S439.86,183,442.15,188a7.26,7.26,0,0,0,4.34,3.74c10,2,20,3.49,30,5.26,1.59.28,3.52.57,4.59,1.59Q490,207,498.4,215.86c1,1,1.11,3.07,1.12,4.64.07,20,.12,40-.07,60,0,2-1.63,4.06-2.52,6.08-.06.14-.24.23-.33.37-10.88,16.45-28.08,19.94-45.79,21.78-7.42.76-11.31,3.57-13.32,11-1.92,7.14-5.63,13.84-8.91,20.57-1.28,2.62-1.05,4.41.55,6.71,6.1,8.74,12.1,17.55,17.9,26.49a13.94,13.94,0,0,1,2.2,6.86c.19,7.66,1.93,16.13-.73,22.75-2.58,6.43-9.82,11-15.09,16.32-9.28,9.34-18.51,18.74-28,27.83-1.8,1.72-4.77,2.6-7.34,3.07-16.68,3-30.67-3-42.74-13.9-8.28-7.51-16.2-8.86-25.82-2.25-4.68,3.21-10.62,4.71-16.13,6.53-2.75.9-4,2.09-4.51,5-1.83,10.83-4,21.61-6.05,32.4a8.34,8.34,0,0,1-1.63,4.07c-5.66,5.89-11.4,11.7-17.33,17.3-1,1-3.07,1.09-4.64,1.09-19.5.07-39,.13-58.5-.07-2.18,0-4.59-1.37-6.47-2.71-13.78-9.82-20.51-23.54-21.07-40.2-.38-11.5-5-18.54-16.86-21-5.56-1.15-10.56-4.83-16-6.89a7.77,7.77,0,0,0-6.1.44c-9.12,5.82-17.94,12.11-27,18a14.33,14.33,0,0,1-6.88,2.14,187.94,187.94,0,0,1-19,0,10.78,10.78,0,0,1-6.51-2.6Q73.72,427.09,53.07,406c-1.52-1.55-2.28-4.24-2.62-6.52-2.3-15.47,1.6-29.09,12.18-40.86a64,64,0,0,0,8.07-12,8.15,8.15,0,0,0,.34-6.12c-3.55-9.13-7.37-18.17-11.38-27.11a6.9,6.9,0,0,0-4.19-3.35c-10.69-2.53-21.47-4.65-32.16-7.17A14.39,14.39,0,0,1,17,299.45c-5.65-5.4-13-10.25-15.89-17C-1.7,276,.23,267.44.2,259.79c-.05-13-.14-26,.11-39,0-2.2,1.66-4.37,2.56-6.55.06-.14.24-.23.33-.36C14,197.61,31,194,48.5,192.2c7.76-.81,11.94-3.81,14-11.62,1.79-6.83,5.34-13.25,8.54-19.64,1.48-3,1.21-5-.65-7.62q-9.09-12.85-17.62-26.08a15,15,0,0,1-2.28-7.34c-.2-7.48-1.86-15.77.75-22.24,2.54-6.28,9.61-10.76,14.77-16,8.69-8.76,17.61-17.28,26.06-26.25,3.62-3.84,7.33-5.93,12.62-5.17A46.81,46.81,0,0,0,111.17,50.32ZM388.74,421.26a36.82,36.82,0,0,0,4.48-3.21c7.71-7.6,15.21-15.43,23.07-22.88,3.74-3.55,4.06-6.66,1.18-10.86-7.72-11.26-15.08-22.77-22.83-34-2.16-3.13-2.55-5.34-.28-8.74,10.73-16.11,17.59-33.92,21.83-52.74.79-3.51,2.23-5.2,6-5.86,13.76-2.43,27.46-5.23,41.17-8,5.53-1.1,7.48-3.59,7.48-9.17,0-9.84-.16-19.67.07-29.5.12-5.07-1.84-7.6-6.88-8.52-13.75-2.5-27.44-5.32-41.17-8-2.74-.53-4.55-1.28-5.3-4.68-4.38-19.65-11.59-38.2-22.82-55-1.56-2.34-1.42-3.91.11-6.16,8.07-11.84,15.89-23.84,23.94-35.69,2.57-3.79,2.49-6.76-1-10.06-7.47-7.14-14.66-14.56-22-21.86-5.31-5.3-6.2-5.4-12.29-1.34-11.36,7.57-22.77,15.08-34,22.8-2.54,1.75-4.36,2-7,.19-16.54-11-34.75-18.17-54.08-22.44-3.67-.81-4.77-2.55-5.37-5.81-2.56-13.75-5.38-27.44-8-41.19-.84-4.49-3.08-6.57-7.8-6.5q-16.23.26-32.49,0c-4.66-.08-7,1.87-7.88,6.4-2.59,13.74-5.47,27.42-7.91,41.19-.66,3.69-2.25,5.23-5.81,6-18.6,4.26-36.41,10.65-52.48,21.18-2.65,1.74-4.47,1.68-7-.08-11.67-8-23.53-15.74-35.25-23.67-3.72-2.52-6.71-2.63-10.06.88q-11.22,11.76-23,23c-3.65,3.48-3.62,6.53-.93,10.47,7.88,11.56,15.46,23.32,23.41,34.83,1.94,2.81,1.86,4.73,0,7.48-10.93,16.4-18,34.49-22.21,53.65-.79,3.54-2.39,4.85-5.76,5.47-13.91,2.54-27.78,5.34-41.67,8-4,.76-6.11,2.85-6.07,7.13.1,11.17.12,22.34,0,33.5,0,4.51,2.13,6.63,6.33,7.43,13.57,2.6,27.09,5.48,40.69,7.83,4.08.71,5.76,2.32,6.69,6.34,4.25,18.43,10.6,36.09,21.06,52,1.92,2.92,1.54,4.81-.27,7.46-7.8,11.41-15.41,23-23.05,34.47-3.6,5.41-3.47,6.42,1.21,11.1,7.42,7.43,15,14.72,22.21,22.33,3.45,3.64,6.53,3.72,10.47,1,8.79-6,18.24-11.22,26.44-18s14.6-6.51,24.2-1.06c13.73,7.79,29.26,12.46,44.16,18.1,3.46,1.3,4.94,3.08,5.58,6.55,2.54,13.74,5.39,27.43,7.95,41.18.84,4.51,3.07,6.57,7.76,6.5,10.83-.16,21.67-.18,32.49,0,5,.09,7.14-2.21,8-6.87,2.57-13.92,5.4-27.78,8.05-41.67.51-2.72,1.58-4.09,4.61-4.77,19.63-4.45,38.18-11.64,55-22.84,2.31-1.53,3.89-1.48,6.17.08,11.69,8,23.5,15.79,35.31,23.6A60.25,60.25,0,0,0,388.74,421.26Z");
    			attr_dev(path0, "transform", "translate(0.43 -0.1)");
    			add_location(path0, file$6, 4, 1, 143);
    			attr_dev(path1, "d", "M361.93,251.15c-.14,60.85-50.56,111-111.43,110.77C190,361.73,139.86,311.3,140,250.72c.14-60.85,50.59-111,111.43-110.77C312,140.17,362.08,190.54,361.93,251.15ZM251.16,172a79,79,0,1,0,78.77,79.42A78.92,78.92,0,0,0,251.16,172Z");
    			attr_dev(path1, "transform", "translate(0.43 -0.1)");
    			add_location(path1, file$6, 5, 1, 4474);
    			set_style(svg, "--fill", /*fill*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 500.01 500.59");
    			attr_dev(svg, "class", "svelte-1niq0rb");
    			add_location(svg, file$6, 3, 0, 49);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fill*/ 1) {
    				set_style(svg, "--fill", /*fill*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Gear", slots, []);
    	let { fill } = $$props;
    	const writable_props = ["fill"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Gear> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	$$self.$capture_state = () => ({ fill });

    	$$self.$inject_state = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fill];
    }

    class Gear extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { fill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Gear",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*fill*/ ctx[0] === undefined && !("fill" in props)) {
    			console.warn("<Gear> was created without expected prop 'fill'");
    		}
    	}

    	get fill() {
    		throw new Error("<Gear>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<Gear>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Svg\Import.svelte generated by Svelte v3.38.3 */

    const file$5 = "src\\Svg\\Import.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(path0, "d", "M75.8,3.21,43,37.2a5.3,5.3,0,0,0,3.86,8.92h17a5.29,5.29,0,0,1,5.3,5.29V99a14,14,0,0,0,14,14h0a14,14,0,0,0,14-14V51.41a5.31,5.31,0,0,1,5.3-5.29h17a5.3,5.3,0,0,0,3.87-8.92l-32.78-34A10.17,10.17,0,0,0,75.8,3.21Z");
    			attr_dev(path0, "transform", "translate(0 0)");
    			add_location(path0, file$5, 4, 1, 137);
    			attr_dev(path1, "d", "M12.5,146a2.5,2.5,0,0,1-2.5-2.5v-56a2.5,2.5,0,0,1,5,0v42.24A13.28,13.28,0,0,0,28.26,143H137.74A13.28,13.28,0,0,0,151,129.74V87.5a2.5,2.5,0,0,1,5,0v56a2.5,2.5,0,0,1-2.5,2.5Z");
    			attr_dev(path1, "transform", "translate(0 0)");
    			add_location(path1, file$5, 5, 1, 387);
    			attr_dev(path2, "d", "M153.5,75A12.5,12.5,0,0,0,141,87.5v42.24a3.26,3.26,0,0,1-3.26,3.26H28.26A3.26,3.26,0,0,1,25,129.74V87.5a12.5,12.5,0,0,0-25,0v56A12.5,12.5,0,0,0,12.5,156h141A12.5,12.5,0,0,0,166,143.5v-56A12.5,12.5,0,0,0,153.5,75Z");
    			attr_dev(path2, "transform", "translate(0 0)");
    			add_location(path2, file$5, 6, 1, 601);
    			set_style(svg, "--fill", /*fill*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 166 156");
    			attr_dev(svg, "class", "svelte-2ta6ls");
    			add_location(svg, file$5, 3, 0, 49);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fill*/ 1) {
    				set_style(svg, "--fill", /*fill*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Import", slots, []);
    	let { fill } = $$props;
    	const writable_props = ["fill"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Import> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	$$self.$capture_state = () => ({ fill });

    	$$self.$inject_state = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fill];
    }

    class Import extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { fill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Import",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*fill*/ ctx[0] === undefined && !("fill" in props)) {
    			console.warn("<Import> was created without expected prop 'fill'");
    		}
    	}

    	get fill() {
    		throw new Error("<Import>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<Import>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Svg\Export.svelte generated by Svelte v3.38.3 */

    const file$4 = "src\\Svg\\Export.svelte";

    function create_fragment$4(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(path0, "d", "M92.2,109.79,125,75.8a5.3,5.3,0,0,0-3.86-8.92h-17a5.29,5.29,0,0,1-5.3-5.29V14a14,14,0,0,0-14-14h0a14,14,0,0,0-14,14V61.59a5.31,5.31,0,0,1-5.3,5.29h-17a5.3,5.3,0,0,0-3.87,8.92l32.78,34A10.17,10.17,0,0,0,92.2,109.79Z");
    			attr_dev(path0, "transform", "translate(0 0)");
    			add_location(path0, file$4, 5, 1, 129);
    			attr_dev(path1, "d", "M12.5,146a2.5,2.5,0,0,1-2.5-2.5v-56a2.5,2.5,0,0,1,5,0v42.24A13.28,13.28,0,0,0,28.26,143H137.74A13.28,13.28,0,0,0,151,129.74V87.5a2.5,2.5,0,0,1,5,0v56a2.5,2.5,0,0,1-2.5,2.5Z");
    			attr_dev(path1, "transform", "translate(0 0)");
    			add_location(path1, file$4, 6, 1, 385);
    			attr_dev(path2, "d", "M153.5,75A12.5,12.5,0,0,0,141,87.5v42.24a3.26,3.26,0,0,1-3.26,3.26H28.26A3.26,3.26,0,0,1,25,129.74V87.5a12.5,12.5,0,0,0-25,0v56A12.5,12.5,0,0,0,12.5,156h141A12.5,12.5,0,0,0,166,143.5v-56A12.5,12.5,0,0,0,153.5,75Z");
    			attr_dev(path2, "transform", "translate(0 0)");
    			add_location(path2, file$4, 7, 1, 599);
    			set_style(svg, "--fill", /*fill*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 166 156");
    			attr_dev(svg, "class", "svelte-2ta6ls");
    			add_location(svg, file$4, 4, 0, 41);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fill*/ 1) {
    				set_style(svg, "--fill", /*fill*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Export", slots, []);
    	let { fill } = $$props;
    	const writable_props = ["fill"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Export> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	$$self.$capture_state = () => ({ fill });

    	$$self.$inject_state = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fill];
    }

    class Export extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { fill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Export",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*fill*/ ctx[0] === undefined && !("fill" in props)) {
    			console.warn("<Export> was created without expected prop 'fill'");
    		}
    	}

    	get fill() {
    		throw new Error("<Export>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<Export>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Svg\Refresh.svelte generated by Svelte v3.38.3 */

    const file$3 = "src\\Svg\\Refresh.svelte";

    function create_fragment$3(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", "M893.4,157.84,1048,.22V477.56H575.21L747.49,310.81C661,196.1,437.46,192.34,315.28,297,163.86,426.7,153,647.6,288.37,786.87c132,135.76,390.73,145.68,528.5-56.1L989.6,822C867.92,1041.52,553.51,1161.58,280,1016.61,7.2,872-82.9,530.87,85.59,266.25,252.39,4.26,626.35-67.37,893.4,157.84Z");
    			attr_dev(path, "transform", "translate(-0.42 -0.22)");
    			attr_dev(path, "class", "svelte-1c4ly94");
    			add_location(path, file$3, 4, 1, 145);
    			set_style(svg, "--fill", /*fill*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 1047.58 1079.78");
    			attr_dev(svg, "class", "svelte-1c4ly94");
    			add_location(svg, file$3, 3, 0, 49);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fill*/ 1) {
    				set_style(svg, "--fill", /*fill*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Refresh", slots, []);
    	let { fill } = $$props;
    	const writable_props = ["fill"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Refresh> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	$$self.$capture_state = () => ({ fill });

    	$$self.$inject_state = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fill];
    }

    class Refresh extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { fill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Refresh",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*fill*/ ctx[0] === undefined && !("fill" in props)) {
    			console.warn("<Refresh> was created without expected prop 'fill'");
    		}
    	}

    	get fill() {
    		throw new Error("<Refresh>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<Refresh>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Main\ConfigButton.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\Main\\ConfigButton.svelte";

    // (16:1) {#if showMenu > 0}
    function create_if_block(ctx) {
    	let menu;
    	let current;

    	menu = new Menu({
    			props: {
    				items: [
    					{
    						icon: Import,
    						text: "Import config",
    						callback: /*func*/ ctx[4]
    					},
    					{
    						icon: Export,
    						text: "Export config",
    						callback: /*func_1*/ ctx[5]
    					},
    					{
    						icon: TrashCan,
    						text: "Clear config",
    						callback: /*func_2*/ ctx[6]
    					}
    				]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(menu.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menu, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menu, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:1) {#if showMenu > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div3;
    	let t0;
    	let div2;
    	let div0;
    	let gear;
    	let t1;
    	let div1;
    	let refresh;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*showMenu*/ ctx[0] > 0 && create_if_block(ctx);

    	gear = new Gear({
    			props: { fill: "var(--card-background)" },
    			$$inline: true
    		});

    	refresh = new Refresh({
    			props: { fill: "var(--card-background)" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			create_component(gear.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			create_component(refresh.$$.fragment);
    			attr_dev(div0, "class", "config-button svelte-aeci1k");
    			add_location(div0, file$2, 50, 2, 1269);
    			attr_dev(div1, "class", "config-button refresh-button svelte-aeci1k");
    			add_location(div1, file$2, 70, 2, 1615);
    			attr_dev(div2, "class", "config-btns-container svelte-aeci1k");
    			add_location(div2, file$2, 49, 1, 1230);
    			attr_dev(div3, "class", "config-root svelte-aeci1k");
    			add_location(div3, file$2, 14, 0, 557);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			if (if_block) if_block.m(div3, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			mount_component(gear, div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(refresh, div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(div1, "click", /*click_handler_1*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showMenu*/ ctx[0] > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showMenu*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div3, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(gear.$$.fragment, local);
    			transition_in(refresh.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(gear.$$.fragment, local);
    			transition_out(refresh.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    			destroy_component(gear);
    			destroy_component(refresh);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ConfigButton", slots, []);
    	let showMenu = -1;
    	let currentTimeout;
    	const { upload, download } = getContext("FileActions");
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ConfigButton> was created with unknown prop '${key}'`);
    	});

    	const func = () => upload().then(val => val.text().then(val => {
    		const applyState = JSON.parse(val);

    		if (applyState["type"] === "state") {
    			delete applyState["type"];
    			state.set(applyState);
    		}
    	}));

    	const func_1 = () => download(exportState(), "config.json");

    	const func_2 = () => {
    		state.set(defaultState());
    	};

    	const click_handler = () => {
    		$$invalidate(0, showMenu *= -1);

    		if (showMenu > 0) {
    			if (currentTimeout) clearTimeout(currentTimeout);

    			$$invalidate(1, currentTimeout = setTimeout(
    				() => {
    					if (showMenu > 0) $$invalidate(0, showMenu = -1);
    				},
    				6000
    			));
    		}
    	};

    	const click_handler_1 = () => {
    		state.update(refreshTimers);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		exportState,
    		refreshTimers,
    		state,
    		defaultState,
    		Menu,
    		Gear,
    		Import,
    		Export,
    		TrashCan,
    		Refresh,
    		showMenu,
    		currentTimeout,
    		upload,
    		download
    	});

    	$$self.$inject_state = $$props => {
    		if ("showMenu" in $$props) $$invalidate(0, showMenu = $$props.showMenu);
    		if ("currentTimeout" in $$props) $$invalidate(1, currentTimeout = $$props.currentTimeout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showMenu,
    		currentTimeout,
    		upload,
    		download,
    		func,
    		func_1,
    		func_2,
    		click_handler,
    		click_handler_1
    	];
    }

    class ConfigButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ConfigButton",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Main\FileContext.svelte generated by Svelte v3.38.3 */
    const file$1 = "src\\Main\\FileContext.svelte";

    function create_fragment$1(ctx) {
    	let t0;
    	let a;
    	let t2;
    	let input;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    			t0 = space();
    			a = element("a");
    			a.textContent = "This text is here to stop vscode from complaining";
    			t2 = space();
    			input = element("input");
    			attr_dev(a, "href", "This href is here to stop vscode from complaining");
    			attr_dev(a, "class", "svelte-14toj8h");
    			add_location(a, file$1, 22, 0, 518);
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", /*limitTo*/ ctx[0]);
    			attr_dev(input, "class", "svelte-14toj8h");
    			add_location(input, file$1, 29, 0, 669);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, a, anchor);
    			/*a_binding*/ ctx[6](a);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[8](input);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*change_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], !current ? -1 : dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*limitTo*/ 1) {
    				attr_dev(input, "accept", /*limitTo*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(a);
    			/*a_binding*/ ctx[6](null);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[8](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FileContext", slots, ['default']);
    	let { limitTo = "" } = $$props;
    	let uploader;
    	let downloader;
    	let currentFileResolve;

    	setContext("FileActions", {
    		upload: () => {
    			uploader.click();

    			return new Promise(resolve => {
    					$$invalidate(3, currentFileResolve = resolve);
    				});
    		},
    		download: (blob, name) => {
    			$$invalidate(2, downloader.href = URL.createObjectURL(blob), downloader);
    			$$invalidate(2, downloader.download = name, downloader);
    			downloader.click();
    		}
    	});

    	const writable_props = ["limitTo"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FileContext> was created with unknown prop '${key}'`);
    	});

    	function a_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			downloader = $$value;
    			$$invalidate(2, downloader);
    		});
    	}

    	const change_handler = () => {
    		currentFileResolve(uploader.files[0]);
    		$$invalidate(1, uploader.value = null, uploader); //? Reset input
    	};

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			uploader = $$value;
    			$$invalidate(1, uploader);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("limitTo" in $$props) $$invalidate(0, limitTo = $$props.limitTo);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		setContext,
    		limitTo,
    		uploader,
    		downloader,
    		currentFileResolve
    	});

    	$$self.$inject_state = $$props => {
    		if ("limitTo" in $$props) $$invalidate(0, limitTo = $$props.limitTo);
    		if ("uploader" in $$props) $$invalidate(1, uploader = $$props.uploader);
    		if ("downloader" in $$props) $$invalidate(2, downloader = $$props.downloader);
    		if ("currentFileResolve" in $$props) $$invalidate(3, currentFileResolve = $$props.currentFileResolve);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		limitTo,
    		uploader,
    		downloader,
    		currentFileResolve,
    		$$scope,
    		slots,
    		a_binding,
    		change_handler,
    		input_binding
    	];
    }

    class FileContext extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { limitTo: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FileContext",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get limitTo() {
    		throw new Error("<FileContext>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set limitTo(value) {
    		throw new Error("<FileContext>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Main\App.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1 } = globals;
    const file = "src\\Main\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (17:3) {#each Object.keys(timers) as timer}
    function create_each_block(ctx) {
    	let div;
    	let timer;
    	let t;
    	let close;
    	let div_transition;
    	let current;

    	timer = new Timer({
    			props: {
    				id: /*timer*/ ctx[2],
    				name: /*timers*/ ctx[0][/*timer*/ ctx[2]].name,
    				active: /*timers*/ ctx[0][/*timer*/ ctx[2]].active,
    				currentTime: /*timers*/ ctx[0][/*timer*/ ctx[2]].currentTime
    			},
    			$$inline: true
    		});

    	close = new Close({
    			props: { id: /*timer*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(timer.$$.fragment);
    			t = space();
    			create_component(close.$$.fragment);
    			attr_dev(div, "class", "timer-margin svelte-1bh1bms");
    			add_location(div, file, 17, 4, 562);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(timer, div, null);
    			append_dev(div, t);
    			mount_component(close, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const timer_changes = {};
    			if (dirty & /*timers*/ 1) timer_changes.id = /*timer*/ ctx[2];
    			if (dirty & /*timers*/ 1) timer_changes.name = /*timers*/ ctx[0][/*timer*/ ctx[2]].name;
    			if (dirty & /*timers*/ 1) timer_changes.active = /*timers*/ ctx[0][/*timer*/ ctx[2]].active;
    			if (dirty & /*timers*/ 1) timer_changes.currentTime = /*timers*/ ctx[0][/*timer*/ ctx[2]].currentTime;
    			timer.$set(timer_changes);
    			const close_changes = {};
    			if (dirty & /*timers*/ 1) close_changes.id = /*timer*/ ctx[2];
    			close.$set(close_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timer.$$.fragment, local);
    			transition_in(close.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -100, y: 0 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timer.$$.fragment, local);
    			transition_out(close.$$.fragment, local);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { x: -100, y: 0 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(timer);
    			destroy_component(close);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(17:3) {#each Object.keys(timers) as timer}",
    		ctx
    	});

    	return block;
    }

    // (15:1) <FileContext limitTo="application/JSON">
    function create_default_slot(ctx) {
    	let div;
    	let t0;
    	let plusbutton;
    	let t1;
    	let configbutton;
    	let current;
    	let each_value = Object.keys(/*timers*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	plusbutton = new PlusButton({ $$inline: true });
    	plusbutton.$on("click", /*click_handler*/ ctx[1]);
    	configbutton = new ConfigButton({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			create_component(plusbutton.$$.fragment);
    			t1 = space();
    			create_component(configbutton.$$.fragment);
    			attr_dev(div, "class", "timer-list-container svelte-1bh1bms");
    			add_location(div, file, 15, 2, 483);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t0);
    			mount_component(plusbutton, div, null);
    			append_dev(div, t1);
    			mount_component(configbutton, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Object, timers*/ 1) {
    				each_value = Object.keys(/*timers*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, t0);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(plusbutton.$$.fragment, local);
    			transition_in(configbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(plusbutton.$$.fragment, local);
    			transition_out(configbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			destroy_component(plusbutton);
    			destroy_component(configbutton);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(15:1) <FileContext limitTo=\\\"application/JSON\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let filecontext;
    	let current;

    	filecontext = new FileContext({
    			props: {
    				limitTo: "application/JSON",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(filecontext.$$.fragment);
    			attr_dev(main, "class", "svelte-1bh1bms");
    			add_location(main, file, 13, 0, 432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(filecontext, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const filecontext_changes = {};

    			if (dirty & /*$$scope, timers*/ 33) {
    				filecontext_changes.$$scope = { dirty, ctx };
    			}

    			filecontext.$set(filecontext_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(filecontext.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filecontext.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(filecontext);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let timers;

    	state.subscribe(val => {
    		$$invalidate(0, timers = val.timers);
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		state.update(addDefaultTimer);
    	};

    	$$self.$capture_state = () => ({
    		PlusButton,
    		Timer,
    		Close,
    		fly,
    		addDefaultTimer,
    		state,
    		ConfigButton,
    		FileContext,
    		timers
    	});

    	$$self.$inject_state = $$props => {
    		if ("timers" in $$props) $$invalidate(0, timers = $$props.timers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [timers, click_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
