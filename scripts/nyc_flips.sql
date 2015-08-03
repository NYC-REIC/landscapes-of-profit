-- join acris data to map pluto
DROP TABLE IF EXISTS nyc_flips;
CREATE TABLE nyc_flips AS (
  SELECT a.council,
         a.zipcode,
         a.cd,
         a.address,
         a.ownername,
         a.zonedist1,
         a.zonedist2,
         a.allzoning1,
         a.allzoning2,
         a.landuse,
         a.yearbuilt,
         a.yearalter1,
         a.yearalter2,
         a.builtfar,
         a.residfar,
         a.commfar,
         a.facilfar,
         a.borocode,
         a.condono,
         a.tract2010,
         a.shape_area,
         a.geom,
         b.before_document_date,
         b.after_document_date,
         b.before_document_amt,
         b.after_document_amt,
         b.ratiopricediff,
         b.dayspast,
         b.bbl
  FROM acris_flips_bbl b, map_pluto_2015v1 a
  WHERE a.bbl = b.bbl
);

-- exclude transactions where profit < $100k and sale >= 5x than purchase
SELECT count(*) FROM nyc_flips
WHERE (after_document_amt - before_document_amt) > 100000 AND (ratiopricediff < 5);

-- aggregate profit by council district
SELECT cast(flip.a::numeric as money) as after, 
       cast(flip.b::numeric as money) as before, 
       cast(((flip.a - flip.b)*0.01)::numeric as money) as flip_tax, 
       flip.council 
FROM (
   SELECT sum(after_document_amt) as a, 
          sum(before_document_amt) as b, 
          council 
   FROM nyc_flips
   WHERE (after_document_amt - before_document_amt) > 100000 AND (ratiopricediff < 5)
   GROUP BY council
) as flip
order by flip_tax desc;