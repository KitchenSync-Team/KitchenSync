"use client";

import { useState } from "react";

export default function RecipeSearchTestPage() {
  const [query, setQuery] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchKeyword() {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "keyword", query }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchIngredients() {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const list = ingredients
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      const res = await fetch("/api/recipes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ingredients", ingredients: list }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Normalize Spoonacular responses:
  // complexSearch → { results: [...] }
  // findByIngredients → [...]
  function getRecipeList() {
    if (!results) return [];
    if (Array.isArray(results.results)) return results.results; // ingredient search
    if (results.results?.results) return results.results.results; // keyword search
    return [];
  }

  const recipeList = getRecipeList();

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        🔍 Recipe Search Test Page
      </h1>

      {/* Keyword Search */}
      <div
        style={{
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid #333",
          borderRadius: "10px",
          background: "#111",
        }}
      >
        <h2 style={{ fontSize: "20px" }}>Keyword Search</h2>
        <input
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            marginBottom: "10px",
            background: "#222",
            color: "white",
            border: "1px solid #444",
            borderRadius: "6px",
          }}
          placeholder="Search for pasta, chicken, soup..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            background: "#4ea3ff",
            border: "none",
            borderRadius: "6px",
            color: "white",
            fontWeight: "bold",
          }}
          onClick={searchKeyword}
        >
          Search by Keyword
        </button>
      </div>

      {/* Ingredient Search */}
      <div
        style={{
          padding: "20px",
          marginBottom: "20px",
          border: "1px solid #333",
          borderRadius: "10px",
          background: "#111",
        }}
      >
        <h2 style={{ fontSize: "20px" }}>Ingredient Search</h2>
        <input
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            marginBottom: "10px",
            background: "#222",
            color: "white",
            border: "1px solid #444",
            borderRadius: "6px",
          }}
          placeholder="eggs, milk, flour"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
        />
        <button
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            background: "#4ea3ff",
            border: "none",
            borderRadius: "6px",
            color: "white",
            fontWeight: "bold",
          }}
          onClick={searchIngredients}
        >
          Search by Ingredients
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red", whiteSpace: "pre-wrap" }}>{error}</p>}

      {/* Recipe Cards */}
      {recipeList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {recipeList.map((recipe: any) => (
            <div
              key={recipe.id}
              style={{
                background: "#1a1a1a",
                padding: "15px",
                borderRadius: "10px",
                border: "1px solid #333",
                textAlign: "center",
              }}
            >
              <img
                src={recipe.image}
                alt={recipe.title}
                style={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              />
              <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>
                {recipe.title}
              </h3>

              <a
                href={`https://spoonacular.com/recipes/${recipe.title.replace(
                  / /g,
                  "-"
                )}-${recipe.id}`}
                target="_blank"
                style={{
                  color: "#4ea3ff",
                  textDecoration: "underline",
                  fontSize: "14px",
                }}
              >
                View Recipe
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
