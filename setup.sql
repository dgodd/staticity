DROP TABLE statuses;
DROP TABLE sites;

CREATE TABLE sites(
  id SERIAL PRIMARY KEY,
  name   varchar NOT NULL CHECK (name <> '')
);
CREATE TABLE statuses(
  site_id integer NOT NULL REFERENCES sites,
  status integer NOT NULL,
  seconds float NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
INSERT INTO sites(name) VALUES('https://shop.lustralspa.com/');
INSERT INTO sites(name) VALUES('https://raindropgear-crystal.herokuapp.com/');
INSERT INTO sites(name) VALUES('https://www.raindropgear.com/');
INSERT INTO sites(name) VALUES('https://www.lustralspa.com/');
INSERT INTO sites(name) VALUES('https://www.liveyourpassion.com.au/');
INSERT INTO sites(name) VALUES('https://i-lluminate.catherinebgarro.com/');
INSERT INTO sites(name) VALUES('https://dev.raindropgear.com/');
INSERT INTO sites(name) VALUES('https://course.catherinebgarro.com/api/charge/health');
INSERT INTO sites(name) VALUES('https://course.catherinebgarro.com/');
INSERT INTO sites(name) VALUES('https://catherinegarro.com/');

CREATE OR REPLACE FUNCTION table_sites_notify() RETURNS trigger AS $$
DECLARE
  id bigint;
BEGIN
  id = NEW.id;
  PERFORM pg_notify('site', json_build_object('id', id, 'name', NEW.name)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS table_sites_trigger ON sites;
CREATE TRIGGER table_sites_trigger AFTER INSERT OR UPDATE ON sites FOR EACH ROW EXECUTE PROCEDURE table_sites_notify();

CREATE OR REPLACE FUNCTION table_statuses_notify() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('status', json_build_object('site_id', NEW.site_id, 'status', NEW.status, 'seconds', NEW.seconds)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS table_statuses_trigger ON statuses;
CREATE TRIGGER table_statuses_trigger AFTER INSERT ON statuses FOR EACH ROW EXECUTE PROCEDURE table_statuses_notify();
