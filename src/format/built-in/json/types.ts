export type JSONWriterOptions = {
    /**
     * Indentation of the emitted JSON. A number of spaces, a literal
     * indent string, or 'auto' — detect the indentation of the existing
     * target file and keep it (falls back to 4 for new files).
     *
     * @default 4
     */
    indent?: number | string | 'auto'
};
