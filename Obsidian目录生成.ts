declare var __dirname: string;
declare var __filename: string;
declare var process: any;
declare var require: any;
namespace Utils {
  const fs: any = require('fs');
  const path: any = require('path');
  interface FilterType {
    include?: (file: string) => boolean,
    exclude?: (file: string) => boolean
  }

  class Tree {
    private root: string;
    private tree: any;
    private treeArr: any[] = [];

    constructor(root: string) {
      this.root = root;
      this.tree = {};
    }
    public getTree(filterType?: FilterType) {
      this.tree = this.getDir(this.root);
      if (filterType) this.tree = this.filterTree(this.tree, filterType);
      this.treeArr = this.treeToArr(this.tree);
      this.sortTreeArr(this.treeArr);
      return {
        tree: this.tree,
        treeArr: this.treeArr
      };
    }
    private getDir(dir: string) {
      const tree: any = {};
      const files: string[] = fs.readdirSync(dir);
      files.forEach((file: string) => {
        const filePath: string = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          tree[file] = this.getDir(filePath);
        }
        if (stat.isFile()) {
          tree[file] = filePath;
        }
      });
      return tree;
    }

    public filterTree(tree: any, filterType?: FilterType) {
      const result: any = {};
      Object.keys(tree).forEach((key: string) => {
        const value: any = tree[key];
        if (typeof value === 'string') {
          if (filterType?.include && (!filterType.include(key) || !filterType.include(value))) return;
          if (filterType?.exclude && (filterType.exclude(key) || filterType.exclude(value))) return;
          result[key] = value;
        } else {
          const subTree: any = this.filterTree(value, filterType);
          if (Object.keys(subTree).length > 0) {
            result[key] = subTree;
          }
        }
      });
      return result;
    }
    private treeToArr(tree: any, arr: any[] = []) {
      Object.keys(tree).forEach((key: string) => {
        const value: any = tree[key];
        if (typeof value === 'string') {
          arr.push({
            title: key,
            path: value
          });
        } else {
          arr.push({
            title: key,
            children: this.treeToArr(value)
          });
        }
      });
      return arr;
    }

    private sortTreeArr(treeArr: any[]) {
      treeArr.sort((a: any, b: any) => {
        if (a.children && b.children) {
          return 0;
        } else if (a.children) {
          return -1;
        } else if (b.children) {
          return 1;
        } else {
          return a.title.localeCompare(b.title);
        }
      });
      treeArr.forEach((item: any) => {
        if (item.children) {
          this.sortTreeArr(item.children);
        }
      });
    }

    // ?????????????????????????????????????.md?????? ???????????????????????????, ???????????????????????????????????????????.md??????
    public deleteAllTreeMd() {
      this.deleteTreeMd(this.tree);
    }

    private deleteTreeMd(tree: any) {
      Object.keys(tree).forEach((key: string) => {
        const value: any = tree[key];
        if (typeof value === 'string') {
          const mdPath: string = path.join(path.dirname(value), '??????????.md');
          if (fs.existsSync(mdPath)) {
            fs.unlinkSync(mdPath)
          }
        } else {
          this.deleteTreeMd(value);
        }
      });
    }

    public deleteAllMdTitle() {
      this.deleteMdTitle(this.tree);
    }

    public deleteMdTitle(tree: any) {
      Object.keys(tree).forEach((key: string) => {
        const value: any = tree[key];
        if (typeof value === 'string') {
          const mdPath: string = value;
          if (fs.existsSync(mdPath)) {
            const mdContent: string = fs.readFileSync(mdPath, 'utf-8');
            const newMdContent: string = mdContent.replace(/#.*\r?\n/, '');
            fs.writeFileSync(mdPath, newMdContent);
          }
        } else {
          this.deleteMdTitle(value);
        }
      });
    }
  }

  // ?????????????????????????????????????.md??????, ??????????????????????????????????????????
  class TreeArrToMd {
    private treeArr: any[];
    private dir: string = '';
    constructor(treeArr: any[], dir: string = './') {
      this.treeArr = treeArr;
      this.dir = dir;
    }

    public generate() {
      this.generatePath(this.treeArr, this.dir);
    }

    private generatePath(treeArr: any[], dir: string) {
      treeArr.forEach((item: any) => {
        if (item.children) {
          this.generatePath(item.children, path.join(dir, item.title));
        }
        const mdPath: string = path.join(dir, '??????????.md');
        const mdContent: string = this.generateMdContent(treeArr, item.title + '??????');
        fs.writeFileSync(mdPath, mdContent);
      });
    }

    private generateMdContent(treeArr: any[], title: string = '??????????') {
      let mdContent: string = ``;

      treeArr.forEach((item: any) => {
        if (item.children) {
          mdContent += `- **[${item.title}](./${item.title}/??????????.md)**\n`;
        } else {
          mdContent += `- [${item.title.replace(/\.md$/, '')}](./${item.title.replace(/\ /g, '%20')})\n`;
        }
      });
      return mdContent;
    }

    // ????????????treeArr??????????????????tree.md
    public static generateTreeMd(treeArr: any[]) {
      const treeMd: string = this.generateTreeMdContent(treeArr);
      fs.writeFileSync('./INDEX.md', treeMd);
    }

    private static generateTreeMdContent(treeArr: any[], level: number = 0) {
      let treeMd: string = '';
      let space: string = '';
      for (let i = 0; i < level; i++) {
        space += '  ';
      }
      treeArr.forEach((item: any) => {
        if (item.children) {
          treeMd += `${space}- **[[${item.title}/??????????|${item.title}]]**\n`;
          treeMd += this.generateTreeMdContent(item.children, level + 1);
        } else {
          treeMd += `${space}- [[${item.title}]]\n`;
        }
      });
      return treeMd;
    }
  }

  enum Command {
    generate = 'generate',
    generateTreeMd = 'generateTreeMd',
    help = 'help'
  }

  class Program {
    private tree: Tree;
    private treeArr: any[];
    private treeArrToMd: TreeArrToMd;
    constructor() {
      this.tree = new Tree('./');
      this.treeArr = this.tree.getTree({
        include: (file: string) => {
          let boolean = false;
          // const endsWith = ['.md','.m4a','.pdf','.zip'];
          // endsWith.forEach((item: string) => {
          //   if (file.endsWith(item)) {
          //     boolean = true;
          //   }
          // });
          boolean = true;
          return boolean;
        },
        exclude: (file: string) => {
          let boolean = false;
          const startsWith = ['.', '-', '~', '??????', '0000', '??????????', 'README', '??????', 'cedict_ts.u8', '??????'];
          startsWith.forEach((item: string) => {
            if (file.startsWith(item)) {
              boolean = true;
            }
          });
          // ???????????????node_modules??????
          if (file.indexOf('node_modules') !== -1) {
            boolean = true;
          }
          return boolean;
        }
      }).treeArr;
      this.treeArrToMd = new TreeArrToMd(this.treeArr);
    }

    public run(command: Command) {
      switch (command) {
        case Command.generate:
          this.generate();
          break;
        case Command.generateTreeMd:
          this.generateTreeMd();
          break;
        default:
          console.log(`help
1: ????????????????.md
2: ???????????????tree.md
3: ??????????????????????.md??????
4: ??????????????????????.md?????????INDEX.md??????
5: ????????????.md?????????????????????
`);
          break;
      }

    }

    public generate() {
      this.treeArrToMd.generate();
    }

    public generateTreeMd() {
      TreeArrToMd.generateTreeMd(this.treeArr);
    }

    public deleteAllTreeMd() {
      this.tree.deleteAllTreeMd();
    }

    // ????????????.md?????????????????????
    public deleteAllMdTitle() {
      this.tree.deleteAllMdTitle();
    }
  }

  const command: string = process.argv[2];
  const program: Program = new Program();

  if (command == '1') {
    program.run(Command.generate);
  } else if (command == "2") {
    program.run(Command.generateTreeMd);
  } else if (command == "3") {
    program.deleteAllTreeMd();
  } else if (command == "4") {
    program.deleteAllTreeMd();
    fs.unlinkSync('./INDEX.md');
  } else if (command == "5") {
    program.deleteAllMdTitle();
  }
  else {
    program.run(Command.generate);
    program.run(Command.help);
  }
}
