--
-- PostgreSQL database dump
--

\restrict j3pDs7UDApZwNK18Jx8aae6gEgcDU56a47GDmH9Uu53OqECoG1PB5umwMKO3slG

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: justwok_app
--

CREATE TABLE public.menu_categories (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.menu_categories OWNER TO justwok_app;

--
-- Name: menu_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: justwok_app
--

ALTER TABLE public.menu_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.menu_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: justwok_app
--

CREATE TABLE public.menu_items (
    id bigint NOT NULL,
    category_id bigint,
    name character varying(150) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    image_url text,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT menu_items_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.menu_items OWNER TO justwok_app;

--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: justwok_app
--

ALTER TABLE public.menu_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.menu_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: justwok_app
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    menu_item_id bigint,
    item_name character varying(150) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    item_notes text,
    line_total numeric(10,2) GENERATED ALWAYS AS ((unit_price * (quantity)::numeric)) STORED,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO justwok_app;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: justwok_app
--

ALTER TABLE public.order_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: justwok_app
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    order_number character varying(30) NOT NULL,
    table_id bigint,
    order_type character varying(20) DEFAULT 'dine_in'::character varying NOT NULL,
    order_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_order_status_check CHECK (((order_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'preparing'::character varying, 'ready'::character varying, 'served'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT orders_order_type_check CHECK (((order_type)::text = ANY ((ARRAY['dine_in'::character varying, 'takeout'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'partially_paid'::character varying, 'paid'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric))
);


ALTER TABLE public.orders OWNER TO justwok_app;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: justwok_app
--

ALTER TABLE public.orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: justwok_app
--

CREATE TABLE public.payments (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(30) NOT NULL,
    payment_reference character varying(100),
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'card'::character varying, 'ewallet'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO justwok_app;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: justwok_app
--

ALTER TABLE public.payments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: restaurant_tables; Type: TABLE; Schema: public; Owner: justwok_app
--

CREATE TABLE public.restaurant_tables (
    id bigint NOT NULL,
    table_number character varying(30) NOT NULL,
    qr_token uuid DEFAULT gen_random_uuid() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.restaurant_tables OWNER TO justwok_app;

--
-- Name: restaurant_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: justwok_app
--

ALTER TABLE public.restaurant_tables ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.restaurant_tables_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: menu_categories; Type: TABLE DATA; Schema: public; Owner: justwok_app
--

COPY public.menu_categories (id, name, description, is_active, created_at) FROM stdin;
1	Rice Meals	Sample rice meals for development testing	t	2026-10-19 18:38:16.873612+08
2	Noodles	Sample noodle dishes for development testing	t	2026-10-19 18:38:16.873612+08
3	Drinks	Sample beverages for development testing	t	2026-10-19 18:38:16.873612+08
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: justwok_app
--

COPY public.menu_items (id, category_id, name, description, price, image_url, is_available, created_at, updated_at) FROM stdin;
1	1	Sample Beef Rice	Development test item	149.00	\N	t	2026-10-19 18:38:16.881125+08	2026-10-19 18:38:16.881125+08
2	1	Sample Chicken Rice	Development test item	129.00	\N	t	2026-10-19 18:38:16.881125+08	2026-10-19 18:38:16.881125+08
3	2	Sample Noodle Soup	Development test item	109.00	\N	t	2026-10-19 18:38:16.881125+08	2026-10-19 18:38:16.881125+08
4	2	Sample Stir-Fried Noodles	Development test item	119.00	\N	t	2026-10-19 18:38:16.881125+08	2026-10-19 18:38:16.881125+08
6	3	Sample Iced Tea	Development test item	39.00	\N	t	2026-10-19 18:38:16.881125+08	2026-10-19 22:49:45.43954+08
5	3	Sample Lemonade	Development test item	49.00	\N	t	2026-10-19 18:38:16.881125+08	2026-10-19 22:49:46.911096+08
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: justwok_app
--

COPY public.order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, item_notes) FROM stdin;
1	1	4	Sample Stir-Fried Noodles	119.00	1	\N
2	1	1	Sample Beef Rice	149.00	1	\N
3	2	6	Sample Iced Tea	39.00	2	\N
4	3	6	Sample Iced Tea	39.00	23	\N
5	3	4	Sample Stir-Fried Noodles	119.00	3	\N
6	3	1	Sample Beef Rice	149.00	2	\N
7	3	5	Sample Lemonade	49.00	2	\N
8	3	3	Sample Noodle Soup	109.00	2	\N
9	4	4	Sample Stir-Fried Noodles	119.00	1	\N
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: justwok_app
--

COPY public.orders (id, order_number, table_id, order_type, order_status, payment_status, subtotal, notes, created_at, updated_at) FROM stdin;
1	JW-000001	\N	takeout	cancelled	unpaid	268.00	\N	2026-10-19 23:22:15.942633+08	2026-10-19 23:27:02.907475+08
2	JW-000002	\N	takeout	cancelled	unpaid	78.00	\N	2026-10-19 23:23:07.590442+08	2026-10-19 23:27:05.621456+08
3	JW-000003	\N	takeout	served	unpaid	1868.00	\N	2026-10-19 23:43:59.861193+08	2026-10-19 23:44:48.690433+08
4	JW-000004	\N	takeout	served	unpaid	119.00	\N	2026-10-19 23:45:03.822653+08	2026-10-19 23:45:31.128528+08
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: justwok_app
--

COPY public.payments (id, order_id, amount, payment_method, payment_reference, received_at) FROM stdin;
\.


--
-- Data for Name: restaurant_tables; Type: TABLE DATA; Schema: public; Owner: justwok_app
--

COPY public.restaurant_tables (id, table_number, qr_token, is_active, created_at) FROM stdin;
\.


--
-- Name: menu_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: justwok_app
--

SELECT pg_catalog.setval('public.menu_categories_id_seq', 3, true);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: justwok_app
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 6, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: justwok_app
--

SELECT pg_catalog.setval('public.order_items_id_seq', 9, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: justwok_app
--

SELECT pg_catalog.setval('public.orders_id_seq', 4, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: justwok_app
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: restaurant_tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: justwok_app
--

SELECT pg_catalog.setval('public.restaurant_tables_id_seq', 1, false);


--
-- Name: menu_categories menu_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_name_key UNIQUE (name);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: restaurant_tables restaurant_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id);


--
-- Name: restaurant_tables restaurant_tables_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_qr_token_key UNIQUE (qr_token);


--
-- Name: restaurant_tables restaurant_tables_table_number_key; Type: CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_table_number_key UNIQUE (table_number);


--
-- Name: idx_menu_items_category; Type: INDEX; Schema: public; Owner: justwok_app
--

CREATE INDEX idx_menu_items_category ON public.menu_items USING btree (category_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: justwok_app
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_status_created; Type: INDEX; Schema: public; Owner: justwok_app
--

CREATE INDEX idx_orders_status_created ON public.orders USING btree (order_status, created_at);


--
-- Name: idx_orders_table; Type: INDEX; Schema: public; Owner: justwok_app
--

CREATE INDEX idx_orders_table ON public.orders USING btree (table_id);


--
-- Name: idx_payments_order; Type: INDEX; Schema: public; Owner: justwok_app
--

CREATE INDEX idx_payments_order ON public.payments USING btree (order_id);


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id);


--
-- Name: order_items order_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: justwok_app
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- PostgreSQL database dump complete
--

\unrestrict j3pDs7UDApZwNK18Jx8aae6gEgcDU56a47GDmH9Uu53OqECoG1PB5umwMKO3slG

