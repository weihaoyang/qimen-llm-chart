declare module "taobi" {
  const taobiModule: {
    TheArtOfBecomingInvisible: new (
      questionTime: Date,
      round?: number | null,
      arranged?: number | null,
      follow?: number,
      options?: { elements?: number },
    ) => unknown;
  };

  export default taobiModule;
}
