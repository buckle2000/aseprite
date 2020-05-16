import {encode, decode} from "https://deno.land/std/encoding/utf8.ts"

function excerpt(text: string, pattern: RegExp): string {
  const match = pattern.exec(text)
  if (!match) throw SyntaxError("Cannot find relevent section because source file changed format")
  return match[1]
}

function formatFlag(flag: string) {
  const match = /(-[^\s]+)(.*)/.exec(flag)
  if (match) {
    const [, op, arg] = match
    return `\`${op}\`${arg}`
  } else throw SyntaxError(`Invalid flag spec: ${flag}`)
}

// read template from stdin
let manual: string = decode(await Deno.readAll(Deno.stdin))

// fill {{options}} from the `Options` section in docs/cli.md
let options = excerpt(await Deno.readTextFile("../docs/cli.md"), /<pre>.*?Options:(.*?)<\/pre>/s)
options = options.trim()
options = options.replace(/<.*?>/gs, "") // strip <a> tags
options = options.replace(/&lt;/g, "<")
options = options.replace(/&gt;/g, ">")
let options_gen = ""
for (let line of options.split('\n')) {
  line = line.trim()
  let tokens = line.split(/\s{2,}/)
  for (const token of tokens) {
    if (token.startsWith("-")) {
      const flags = token.split(", ")
      if (flags.length < 1) throw SyntaxError(`Invalid flag specification: ${token}`)
      options_gen += "\n  * "
      options_gen += flags.map(formatFlag).join(", ")
      options_gen += ":\n"
    } else {
      options_gen += `    ${token}  \n`
    }
  }
}
manual = manual.replace("{{options}}", options_gen)


// fill {{description}} from the `Introduction` section of README.md
const README = await Deno.readTextFile("../README.md")

function replaceFromReadme(name: string, section: string, stripLinks: boolean) {
  let s = excerpt(README + "\n\n##", new RegExp(`## ${section}(.*?)##`, "s"))
  s = s.trim()
  if (stripLinks) s = s.replace(/\[(.*?)\]\(.*?\)/gs, "$1")
  manual = manual.replace(`{{${name}}}`, s)
}

replaceFromReadme("description", "Introduction", true)
replaceFromReadme("authors", "Authors", true)
replaceFromReadme("additonal_authors", "Credits", true)
replaceFromReadme("copyright", "License", false)

// fill {{examples}} from all over the same file
manual = manual.replace("{{examples}}", "TODO")

// write to stdout
await Deno.writeAll(Deno.stdout, encode(manual))
