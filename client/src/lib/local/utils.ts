import { promises as _promises } from 'fs';
import { pathExists } from 'fs-extra';
import matter from 'gray-matter';

import { OpenApiFile } from '@/types/openApi';
import { Snippet } from '@/types/snippet';

const { readdir, readFile } = _promises;

export const getFileList = async (dirName: string, og = dirName) => {
  let files: string[] = [];
  const items = await readdir(dirName, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      files = [...files, ...(await getFileList(`${dirName}/${item.name}`, og))];
    } else {
      const path = `${dirName}/${item.name}`;
      const name = path.replace(og, '');
      files.push(name);
    }
  }

  return files;
};

export const getExtension = (path: string) => {
  return path.substring(path.lastIndexOf('.') + 1, path.length) || path;
};

export const removeExtension = (path: string) => {
  return path.substring(0, path.lastIndexOf('.'));
};

export const getPathsByExtension = (files: string[], ...extensions: string[]): string[] => {
  return files.filter((file) => {
    const extension = getExtension(file);
    return extensions.includes(extension);
  });
};

export const getPagePath = async (slug: string) => {
  const mdxPath = `src/_props/${slug}.mdx`;
  if (await pathExists(mdxPath)) {
    return mdxPath;
  }
  const mdPath = `src/_props/${slug}.mdx`;
  if (await pathExists(mdPath)) {
    return mdPath;
  }
  return null;
};

export const getFileContents = async (path: string) => {
  return (await readFile(path)).toString();
};

export const getFileContentsAsObject = async (path: string) => {
  return JSON.parse(await getFileContents(path));
};

export const getPrebuiltData = async (name: string) => {
  return getFileContentsAsObject(`src/_props/${name}.json`);
};

export const confirmFaviconsWereGenerated = async () => {
  // We could do more granular testing for this but there will
  // not be a case where only a few of these are generated.
  // It's all or nothing.
  return (
    (await pathExists('public/favicons/apple-touch-icon.png')) &&
    (await pathExists('public/favicons/favicon-32x32.png')) &&
    (await pathExists('public/favicons/favicon-16x16.png')) &&
    (await pathExists('public/favicons/favicon.ico'))
  );
};

function optionallyRemoveLeadingSlash(path: string) {
  if (!path || path.startsWith('/')) {
    return path.substring(1);
  }
  return path;
}

export const getSnippets = async (): Promise<Snippet[]> => {
  const snippetPath = 'src/_props/_snippets';
  if (!(await pathExists(snippetPath))) {
    return [];
  }
  const snippetFilenames = await getFileList(snippetPath);
  const snippetArr: Snippet[] = await Promise.all(
    snippetFilenames.map(async (filename) => {
      const content = await getFileContents(`${snippetPath}${filename}`);
      return {
        snippetFileLocation: optionallyRemoveLeadingSlash(filename),
        content,
      };
    })
  );
  return snippetArr;
};

export const extractPageMetadata = (
  pagePath: string,
  pageContent: string,
  openApiFiles: OpenApiFile[]
) => {
  const { data: metadata, content } = matter(pageContent);

  // Replace .mdx so we can pass file paths into this function
  const slug = pagePath.replace(/\.mdx?$/, '');
  let defaultTitle = slugToTitle(slug);
  // Append data from OpenAPI if it exists
  const { title, description } = getOpenApiTitleAndDescription(openApiFiles, metadata?.openapi);

  if (title) {
    defaultTitle = title;
  }

  const pageMetadata = {
    title: defaultTitle,
    description,
    ...metadata,
    href: optionallyAddLeadingSlash(slug),
  };

  return { pageMetadata, content };
};

const slugToTitle = (slug: string) => {
  const slugArr = slug.split('/');
  let defaultTitle = slugArr[slugArr.length - 1].split('-').join(' '); //replace all dashes
  defaultTitle = defaultTitle.split('_').join(' '); //replace all underscores
  defaultTitle = defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1); //capitalize first letter
  return defaultTitle;
};

function optionallyAddLeadingSlash(path: string) {
  if (path.startsWith('/')) {
    return path;
  }
  return '/' + path;
}

const getOpenApiTitleAndDescription = (openApiFiles: OpenApiFile[], openApiMetaField: string) => {
  if (openApiFiles == null || !openApiMetaField || openApiMetaField == null) {
    return {};
  }

  const { operation } = getOpenApiOperationMethodAndEndpoint(openApiFiles, openApiMetaField);

  if (operation == null) {
    return {};
  }

  return {
    title: operation?.summary,
    description: operation?.description,
  };
};

// TODO: Proper types
const getOpenApiOperationMethodAndEndpoint = (
  openApiFiles: OpenApiFile[],
  openApiMetaField: string
): any => {
  const { endpoint, method, filename } = extractMethodAndEndpoint(openApiMetaField);

  let path;

  openApiFiles?.forEach((file) => {
    const openApiFile = file.spec;
    const openApiPath = openApiFile.paths && openApiFile.paths[endpoint];
    const isFilenameOrNone = !filename || filename === file.filename;
    if (openApiPath && isFilenameOrNone) {
      path = openApiPath;
    }
  });

  if (path == null) {
    return {};
  }

  let operation;
  if (method) {
    operation = path[method.toLowerCase()];
  } else {
    const firstOperationKey = Object.keys(path)[0];
    operation = path[firstOperationKey];
  }

  return {
    operation,
    method,
    endpoint,
  };
};

const extractMethodAndEndpoint = (openApiMetaField: string) => {
  const methodRegex = /(get|post|put|delete|patch)\s/i;
  const trimmed = openApiMetaField.trim();
  const foundMethod = trimmed.match(methodRegex);

  const startIndexOfMethod = foundMethod ? openApiMetaField.indexOf(foundMethod[0]) : 0;
  const endIndexOfMethod = foundMethod ? startIndexOfMethod + foundMethod[0].length - 1 : 0;

  const filename = openApiMetaField.substring(0, startIndexOfMethod).trim();

  return {
    method: foundMethod ? foundMethod[0].slice(0, -1).toUpperCase() : undefined,
    endpoint: openApiMetaField.substring(endIndexOfMethod).trim(),
    filename: filename ? filename : undefined,
  };
};
