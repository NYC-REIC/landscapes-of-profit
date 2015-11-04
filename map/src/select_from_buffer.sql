-- This is the query that needs to get passed to select 
-- geometries from the tax lot table
SELECT *
FROM nyc_flips_pluto_150712
WHERE ST_Within(
  the_geom_webmercator,
  ST_Buffer(
    ST_Transform(
      ST_GeomFromText('Point(-73.925028 40.694631)', 4326),
      3857
    ),
    1000
  )
)

-- return true if features intersect
SELECT 
  a.after_d_01, 
  a.before__01, 
  a.cartodb_id, 
  a.the_geom_webmercator, 
  within
FROM (
  SELECT *,
  ST_DWithin(
    the_geom_webmercator,
    ST_Transform(
      ST_GeomFromText('Point(-73.925028 40.694631)', 4326),
    3857),
    741
  ) as within
  FROM nyc_flips_pluto_150712
) as a
WHERE a.within = true
