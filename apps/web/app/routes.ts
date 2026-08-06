import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("moderate", "routes/moderate.tsx"),
  route("connections/:id", "routes/connections.$id.tsx"),
  layout("routes/shell.tsx", [
    route("vista", "routes/vista._index.tsx"),
    route("vista/film/:slug", "routes/vista.film.$slug.tsx"),
    route("vista/place/:slug", "routes/vista.place.$slug.tsx"),
    route("homage", "routes/homage._index.tsx"),
    route("homage/film/:slug", "routes/homage.film.$slug.tsx"),
    route("homage/person/:slug", "routes/homage.person.$slug.tsx"),
    route("homage/collection/:slug", "routes/homage.collection.$slug.tsx"),
    route("focus", "routes/focus._index.tsx"),
    route("focus/:slug", "routes/focus.$slug.tsx"),
    route("focus/film/:slug", "routes/focus.film.$slug.tsx"),
  ]),
] satisfies RouteConfig;
