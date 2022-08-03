## Installing

In our development specification, <span translate="no">Yarn 2</span> is the 
**ONLY** package manager that should be used, so if you wish to publish 
production content to our platform, please ensure that the package manager you 
are using is <span translate="no">Yarn 2</span>.

Install via <span translate="no">Yarn 2</span>:

```shell
yarn add @recative/ap-core
```

You may also want to install a CLI tool to make sure the project directory 
structure is aligned to our development specification.

```shell
yarn add -D @paperclip/interactive-cli
```

## Initialize the project

Let's assume you are a creator and want to create your own interactive video show.

The structure of a interactive video show could be break down to tree levels:

* **Show**: Contains many episodes, the minimum unit that could be published on 
our platform. 
* **Episode**: It's basically a video interspersed with some interactive
programs.
* **Interactive Point**: An interactive program, to make it easier to develop an 
interactive program is the primary goal of our SDK to accomplish.

There're three command in `@paperclip/interactive-cli` for you to initialize
these three parts.

To initialize a new show, run the following command:

```shell
yarn create-interactive-app
yarn
```

This command will automatically generate Webpack config, dependence list, 
development tools and directory structure for you.

To create a new episode, run the following command:

```shell
?
```

This command will generate a new folder on `src/episodes/`, you should give your
episode a meaningful name.

To initialize a new interactive point, you can use:

```shell
yarn run create-interactive-part
```

This command will generate a template for you to getting started developing your
own interactive point.