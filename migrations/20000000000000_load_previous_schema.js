const _ = require('lodash');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const utils = require('../lib/knex-utils');

const logger = config.logger('migrations');

exports.up = function(knex, Promise) {
  utils.logMigration(knex);
  return utils.sequentially(knex, loadPreviousSchema, loadPreviousData);
};

exports.down = function(knex, Promise) {
  throw new Error('This migration is not reversible');
};

function loadPreviousSchema(knex) {
  return knex.schema.raw(DUMP);
}

function loadPreviousData(knex) {
  if (config.env == 'test') {
    return;
  }

  const dataDumpFile = path.join(__dirname, '..', 'data-dump.sql');
  if (!fs.existsSync(dataDumpFile)) {
    return logger.info(`No data dump found (place a "data-dump.sql" file in the project's root directory to load the previous database's data)`);
  }

  return knex.schema.raw(fs.readFileSync(dataDumpFile, { encoding: 'utf8' }));
}

const DUMP = `
--
-- PostgreSQL database dump
--

-- Dumped from database version 9.4.5
-- Dumped by pg_dump version 9.4.5
-- Started on 2017-06-23 10:06:45

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- TOC entry 197 (class 1259 OID 51318)
-- Name: bird; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE bird (
    id_poi integer NOT NULL,
    id_specie integer,
    geom geometry(GeometryZM,4326)
);


--
-- TOC entry 203 (class 1259 OID 51368)
-- Name: bird_family; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE bird_family (
    id_family integer NOT NULL,
    family_name text,
    comment text,
    id_class integer
);


--
-- TOC entry 207 (class 1259 OID 51400)
-- Name: bird_height; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE bird_height (
    id_height integer NOT NULL,
    description text
);


--
-- TOC entry 202 (class 1259 OID 51360)
-- Name: bird_species; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE bird_species (
    id_specie integer NOT NULL,
    id_family integer,
    common_name text,
    scientific_name text,
    period_start integer,
    period_end integer,
    calender text,
    physical_characteristics text,
    picture_small text,
    picture_medium text,
    picture_large text,
    sound_characteristics text,
    habitat_characteristics text,
    nesting_characteristics text,
    food text,
    wingspan real,
    size real,
    weight real,
    behavior text,
    comment text,
    website text,
    id_height integer
);


--
-- TOC entry 208 (class 1259 OID 51408)
-- Name: class; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE class (
    id_class integer NOT NULL,
    class_name text,
    id_reign integer
);


--
-- TOC entry 199 (class 1259 OID 51336)
-- Name: owner; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE owner (
    id_owner integer NOT NULL,
    owner_name text,
    owner_address text,
    owner_zipcode integer,
    owner_city text,
    owner_website text,
    owner_comment text
);


--
-- TOC entry 198 (class 1259 OID 51328)
-- Name: reign; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE reign (
    id_reign integer NOT NULL,
    reign_name text
);


--
-- TOC entry 201 (class 1259 OID 51352)
-- Name: theme; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE theme (
    id_theme integer NOT NULL,
    theme_name text
);


--
-- TOC entry 196 (class 1259 OID 51310)
-- Name: butterfly; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE butterfly (
    id_poi integer NOT NULL,
    id_specie integer,
    nb_obs_adult integer,
    nb_obs_male integer,
    nb_obs_female integer,
    nb_obs_child integer,
    geom geometry(GeometryZ,4326)
);


--
-- TOC entry 206 (class 1259 OID 51392)
-- Name: butterfly_family; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE butterfly_family (
    id_family integer NOT NULL,
    family_name text,
    id_class integer
);


--
-- TOC entry 204 (class 1259 OID 51376)
-- Name: butterfly_species; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE butterfly_species (
    id_specie integer NOT NULL,
    id_family integer,
    common_name text,
    scientific_name text,
    period_start integer,
    period_end integer,
    physical_characteristics_adult text,
    physical_characteristics_child text,
    habitat_characteristics text,
    wingspan real,
    comment text,
    website text
);


--
-- TOC entry 205 (class 1259 OID 51384)
-- Name: division; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE division (
    id_division integer NOT NULL,
    division_name text,
    id_reign integer
);


--
-- TOC entry 211 (class 1259 OID 51430)
-- Name: flora_family; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE flora_family (
    id_family integer NOT NULL,
    family_name text,
    id_division integer
);


--
-- TOC entry 191 (class 1259 OID 51267)
-- Name: flower; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE flower (
    obs_id_anc integer,
    id_specie integer,
    id_poi integer NOT NULL,
    geom geometry(GeometryZM,4326)
);


--
-- TOC entry 212 (class 1259 OID 51438)
-- Name: flower_species; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE flower_species (
    id_specie integer NOT NULL,
    scientific_name text,
    common_name_fr text,
    common_name_de text,
    common_name_it text,
    common_name_la text,
    obs_code_fh_2012 text,
    obs_code_fh_2007 text,
    id_family integer,
    height real,
    period_start integer,
    period_end integer,
    physical_characteristics text,
    habitat_characteristics text,
    anecdote text,
    website text
);


--
-- TOC entry 189 (class 1259 OID 51253)
-- Name: tree; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE tree (
    obs_id_anc integer,
    id_specie integer,
    id_poi integer NOT NULL,
    geom geometry(GeometryZM,4326)
);


--
-- TOC entry 213 (class 1259 OID 51446)
-- Name: tree_species; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE tree_species (
    id_specie integer NOT NULL,
    scientific_name text,
    common_name_fr text,
    common_name_de text,
    common_name_it text,
    common_name_la text,
    obs_code_fh_2012 text,
    obs_code_fh_2007 text,
    id_family integer,
    height real,
    period_start integer,
    period_end integer,
    physical_characteristics text,
    habitat_characteristics text,
    anecdote text,
    website text
);


--
-- TOC entry 193 (class 1259 OID 51281)
-- Name: path; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE path (
    id_path integer NOT NULL,
    id_type integer,
    name text,
    length integer,
    created_at timestamp without time zone,
    geom geometry(GeometryZ,4326)
);


--
-- TOC entry 200 (class 1259 OID 51344)
-- Name: path_type; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE path_type (
    id_type integer NOT NULL,
    name text
);


--
-- TOC entry 218 (class 1259 OID 51533)
-- Name: poi; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE poi (
    id_poi integer NOT NULL,
    created_at timestamp without time zone,
    id_theme integer,
    id_owner integer,
    id_zone integer
);


--
-- TOC entry 195 (class 1259 OID 51299)
-- Name: zone; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE zone (
    id_zone integer NOT NULL,
    keyword_zone text,
    description_zone text,
    keyword_nature text,
    created_at timestamp without time zone,
    geom geometry(Geometry,4326)
);


--
-- TOC entry 194 (class 1259 OID 51291)
-- Name: zone_point; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE zone_point (
    id_point integer NOT NULL,
    type text,
    created_at timestamp without time zone,
    id_zone integer,
    geom geometry(GeometryZM,4326)
);

--
-- TOC entry 3312 (class 2606 OID 51375)
-- Name: bird_family_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY bird_family
    ADD CONSTRAINT bird_family_pkey PRIMARY KEY (id_family);


--
-- TOC entry 3320 (class 2606 OID 51407)
-- Name: bird_height_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY bird_height
    ADD CONSTRAINT bird_height_pkey PRIMARY KEY (id_height);


--
-- TOC entry 3300 (class 2606 OID 51322)
-- Name: bird_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY bird
    ADD CONSTRAINT bird_pkey PRIMARY KEY (id_poi);


--
-- TOC entry 3310 (class 2606 OID 51367)
-- Name: bird_species_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY bird_species
    ADD CONSTRAINT bird_species_pkey PRIMARY KEY (id_specie);


--
-- TOC entry 3318 (class 2606 OID 51399)
-- Name: butterfly_family_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY butterfly_family
    ADD CONSTRAINT butterfly_family_pkey PRIMARY KEY (id_family);


--
-- TOC entry 3297 (class 2606 OID 51314)
-- Name: butterfly_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY butterfly
    ADD CONSTRAINT butterfly_pkey PRIMARY KEY (id_poi);


--
-- TOC entry 3314 (class 2606 OID 51383)
-- Name: butterfly_species_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY butterfly_species
    ADD CONSTRAINT butterfly_species_pkey PRIMARY KEY (id_specie);


--
-- TOC entry 3322 (class 2606 OID 51415)
-- Name: class_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY class
    ADD CONSTRAINT class_pkey PRIMARY KEY (id_class);


--
-- TOC entry 3316 (class 2606 OID 51391)
-- Name: division_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY division
    ADD CONSTRAINT division_pkey PRIMARY KEY (id_division);


--
-- TOC entry 3324 (class 2606 OID 51437)
-- Name: flora_family_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY flora_family
    ADD CONSTRAINT flora_family_pkey PRIMARY KEY (id_family);


--
-- TOC entry 3285 (class 2606 OID 51271)
-- Name: flower_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY flower
    ADD CONSTRAINT flower_pkey PRIMARY KEY (id_poi);


--
-- TOC entry 3326 (class 2606 OID 51445)
-- Name: flower_species_pkey1; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY flower_species
    ADD CONSTRAINT flower_species_pkey1 PRIMARY KEY (id_specie);


--
-- TOC entry 3304 (class 2606 OID 51343)
-- Name: owner_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY owner
    ADD CONSTRAINT owner_pkey PRIMARY KEY (id_owner);


--
-- TOC entry 3288 (class 2606 OID 51288)
-- Name: path_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY path
    ADD CONSTRAINT path_pkey PRIMARY KEY (id_path);


--
-- TOC entry 3306 (class 2606 OID 51351)
-- Name: path_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY path_type
    ADD CONSTRAINT path_type_pkey PRIMARY KEY (id_type);


--
-- TOC entry 3330 (class 2606 OID 51537)
-- Name: poi_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY poi
    ADD CONSTRAINT poi_pkey PRIMARY KEY (id_poi);


--
-- TOC entry 3302 (class 2606 OID 51335)
-- Name: reign_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY reign
    ADD CONSTRAINT reign_pkey PRIMARY KEY (id_reign);


--
-- TOC entry 3308 (class 2606 OID 51359)
-- Name: theme_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY theme
    ADD CONSTRAINT theme_pkey PRIMARY KEY (id_theme);


--
-- TOC entry 3282 (class 2606 OID 51257)
-- Name: tree_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY tree
    ADD CONSTRAINT tree_pkey PRIMARY KEY (id_poi);


--
-- TOC entry 3328 (class 2606 OID 51453)
-- Name: tree_species_pkey1; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY tree_species
    ADD CONSTRAINT tree_species_pkey1 PRIMARY KEY (id_specie);


--
-- TOC entry 3294 (class 2606 OID 51306)
-- Name: zone_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY zone
    ADD CONSTRAINT zone_pkey PRIMARY KEY (id_zone);


--
-- TOC entry 3291 (class 2606 OID 51298)
-- Name: zone_point_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY zone_point
    ADD CONSTRAINT zone_point_pkey PRIMARY KEY (id_point);


--
-- TOC entry 3298 (class 1259 OID 51327)
-- Name: bird_geom_1494334739127; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX bird_geom_1494334739127 ON bird USING gist (geom);


--
-- TOC entry 3295 (class 1259 OID 51326)
-- Name: butterfly_geom_149433473972; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX butterfly_geom_149433473972 ON butterfly USING gist (geom);


--
-- TOC entry 3283 (class 1259 OID 51275)
-- Name: flower_geom_1494333349213; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX flower_geom_1494333349213 ON flower USING gist (geom);


--
-- TOC entry 3286 (class 1259 OID 51309)
-- Name: path_geom_1494333870183; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX path_geom_1494333870183 ON path USING gist (geom);


--
-- TOC entry 3280 (class 1259 OID 51261)
-- Name: tree_geom_1494332941822; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX tree_geom_1494332941822 ON tree USING gist (geom);


--
-- TOC entry 3292 (class 1259 OID 51308)
-- Name: zone_geom_1494333870168; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX zone_geom_1494333870168 ON zone USING gist (geom);


--
-- TOC entry 3289 (class 1259 OID 51307)
-- Name: zone_point_geom_1494333870107; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX zone_point_geom_1494333870107 ON zone_point USING gist (geom);


-- Completed on 2017-06-23 10:06:46

--
-- PostgreSQL database dump complete
--
`;
