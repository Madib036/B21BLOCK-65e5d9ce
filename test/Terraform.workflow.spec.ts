import { expect } from './shared/expect'
import fs from 'fs'
import path from 'path'

// .github/workflows/Terraform.md is a documentation file (not a `.yml`/`.yaml` file, so it is
// never picked up or executed by GitHub Actions). It documents an example Terraform Cloud
// workflow, including setup instructions and a sample workflow definition. These tests verify
// the static content and structure of that documentation stays intact and internally consistent.
describe('.github/workflows/Terraform.md', () => {
  const filePath = path.join(__dirname, '..', '.github', 'workflows', 'Terraform.md')
  let contents: string

  before(() => {
    contents = fs.readFileSync(filePath, 'utf8')
  })

  it('exists on disk', () => {
    expect(fs.existsSync(filePath)).to.eq(true)
  })

  it('is not empty', () => {
    expect(contents.trim().length).to.be.greaterThan(0)
  })

  describe('documentation header', () => {
    it('explains what the workflow installs and configures', () => {
      expect(contents).to.include('This workflow installs the latest version of Terraform CLI')
      expect(contents).to.include('configures the Terraform CLI configuration file')
    })

    it('describes the pull_request behavior', () => {
      expect(contents).to.include('On pull request events, this workflow will run')
      expect(contents).to.include('`terraform init`')
      expect(contents).to.include('`terraform fmt`')
      expect(contents).to.include('`terraform plan`')
    })

    it('describes the push-to-main behavior', () => {
      expect(contents).to.include('On push events')
      expect(contents).to.include('to the "main" branch, `terraform apply` will be executed.')
    })

    it('links to the hashicorp/setup-terraform documentation', () => {
      expect(contents).to.include('https://github.com/hashicorp/setup-terraform')
    })

    it('documents the three required setup steps', () => {
      expect(contents).to.include('1. Create a `main.tf` file in the root of this repository')
      expect(contents).to.include('2. Generate a Terraform Cloud user API token')
      expect(contents).to.include('3. Reference the GitHub secret in step using the `hashicorp/setup-terraform` GitHub Action.')
    })

    it('includes an example remote backend configuration referencing an example org/workspace', () => {
      expect(contents).to.include('backend "remote"')
      expect(contents).to.include('organization = "example-organization"')
      expect(contents).to.include('name = "example-workspace"')
    })

    it('references the TF_API_TOKEN secret in the setup example', () => {
      expect(contents).to.include('cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}')
    })
  })

  describe('workflow definition', () => {
    it('is named "Terraform"', () => {
      expect(contents).to.match(/\bname:\s*'Terraform'/)
    })

    it('triggers on push to main and on pull_request', () => {
      expect(contents).to.match(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[\s*"main"\s*\]/)
      expect(contents).to.match(/pull_request:/)
    })

    it('restricts default permissions to read-only contents', () => {
      expect(contents).to.match(/permissions:\s*\n\s*contents:\s*read/)
    })

    it('defines a single "terraform" job running on ubuntu-latest in the production environment', () => {
      expect(contents).to.match(/jobs:\s*\n\s*terraform:/)
      expect(contents).to.include("name: 'Terraform'")
      expect(contents).to.include('runs-on: ubuntu-latest')
      expect(contents).to.include('environment: production')
    })

    it('defaults to running steps with the bash shell', () => {
      expect(contents).to.match(/defaults:\s*\n\s*run:\s*\n\s*shell:\s*bash/)
    })

    it('checks out the repository using actions/checkout@v4', () => {
      expect(contents).to.match(/name:\s*Checkout\s*\n\s*uses:\s*actions\/checkout@v4/)
    })

    it('sets up Terraform using hashicorp/setup-terraform@v1 with the TF_API_TOKEN secret', () => {
      expect(contents).to.match(/name:\s*Setup Terraform\s*\n\s*uses:\s*hashicorp\/setup-terraform@v1/)
      expect(contents).to.match(/cli_config_credentials_token:\s*\$\{\{\s*secrets\.TF_API_TOKEN\s*\}\}/)
    })

    it('runs terraform init', () => {
      expect(contents).to.match(/name:\s*Terraform Init\s*\n\s*run:\s*terraform init/)
    })

    it('runs terraform fmt in check mode', () => {
      expect(contents).to.match(/name:\s*Terraform Format\s*\n\s*run:\s*terraform fmt -check/)
    })

    it('runs a non-interactive terraform plan', () => {
      expect(contents).to.match(/name:\s*Terraform Plan\s*\n\s*run:\s*terraform plan -input=false/)
    })

    it('runs terraform apply only for pushes, gated by the ref/event conditional', () => {
      expect(contents).to.match(/name:\s*Terraform Apply/)
      expect(contents).to.include("if: github.ref == 'refs/heads/\"main\"' && github.event_name == 'push'")
      expect(contents).to.include('run: terraform apply -auto-approve -input=false')
    })

    it('defines the workflow steps in the documented order', () => {
      // The leading comment block documents an example "Setup Terraform" step, so restrict the
      // search to the actual `jobs:` section to avoid matching that documentation example.
      const jobsSectionStart = contents.indexOf('jobs:\n  terraform:')
      expect(jobsSectionStart, 'expected to find the "jobs" section').to.be.greaterThan(-1)
      const jobsSection = contents.slice(jobsSectionStart)

      const stepNames = ['Checkout', 'Setup Terraform', 'Terraform Init', 'Terraform Format', 'Terraform Plan', 'Terraform Apply']
      const indices = stepNames.map((step) => jobsSection.indexOf(`name: ${step}`))

      indices.forEach((index, i) => {
        expect(index, `expected to find step "${stepNames[i]}"`).to.be.greaterThan(-1)
      })

      for (let i = 1; i < indices.length; i++) {
        expect(indices[i], `expected "${stepNames[i]}" to appear after "${stepNames[i - 1]}"`).to.be.greaterThan(indices[i - 1])
      }
    })
  })

  describe('structural sanity checks', () => {
    it('does not contain literal tab characters (YAML/documentation should use spaces)', () => {
      expect(contents.includes('\t')).to.eq(false)
    })

    it('has a matching number of opening and closing curly-brace expression markers', () => {
      const opens = contents.match(/\$\{\{/g) || []
      const closes = contents.match(/\}\}/g) || []
      expect(opens.length).to.eq(closes.length)
    })

    it('keeps the "on", "permissions", and "jobs" top-level keys in the expected relative order', () => {
      const onIndex = contents.indexOf('\non:')
      const permissionsIndex = contents.indexOf('\npermissions:')
      const jobsIndex = contents.indexOf('\njobs:')

      expect(onIndex).to.be.greaterThan(-1)
      expect(permissionsIndex).to.be.greaterThan(onIndex)
      expect(jobsIndex).to.be.greaterThan(permissionsIndex)
    })
  })
})