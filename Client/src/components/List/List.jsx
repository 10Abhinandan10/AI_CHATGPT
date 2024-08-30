import React from "react";
import "./List.scss";
import Card from "../Card/Card";
import useFetch from "../hooks/useFetch";

const List = ({ subCats, maxPrice, sort, catId }) => {
  
  // Construct the sub-category filters
  const subCatFilter = subCats
    .map((item) => `&[filters][sub_categories][id][$eq]=${item}`)
    .join("");
  
  // Construct the sort query
  const sortQuery = sort ? `&sort=price:${sort}` : "";

  const { data, loading, error } = useFetch(
    `/products?populate=*&[filters][categories][id]=${catId}${subCatFilter}&[filters][price][$lte]=${maxPrice}${sortQuery}`
  );

  return (
    <div className="list">
      {loading
        ? "Loading..."
        : error
        ? `Error: ${error.message}`
        : data?.map((item) => <Card item={item} key={item.id} />)}
    </div>
  );
};

export default List;
