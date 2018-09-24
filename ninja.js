var app = new Vue({
    el: '#ninja',
    data () {
        return {
            user_input: null,
            previous_input: '',
            pmid: null,

            title: null,
            authors: null,
            journal: null,
            year: null,
            volume: null,
            issue: null,
            pages: null,
            pubstatus: null,

            success: false,
            loading: false,
            errored: false,
            failed: false,
            copied: false,
        }
    },
    methods: {
        reset_data: function() {
            this.pmid = null;

            this.title = null;
            this.authors = null;
            this.journal = null;
            this.year = null;
            this.volume = null;
            this.issue = null;
            this.pages = null;
            this.pubstatus = null;

            this.success = false;
            this.loading = false;
            this.errored = false;
            this.failed = false;
            this.copied = false;
        },
        generate: function() {

            if (this.user_input == this.previous_input) {

                // If nothing has changed, stay calm.

            } else {

                // Make a clean start
                this.reset_data();

                this.loading = true;

                // Regular expressions
                var regex_doi = new RegExp('(10[.][0-9]{4,}(?:[.][0-9]+)*/(?:(?![%"#? ])\\S)+)', 'i');
                var regex_pmcid = new RegExp('(pmc[0-9]+)', 'i');
                var regex_pubmed_url = new RegExp('(\/pubmed\/[0-9]+)', 'i');
                var regex_pmid = new RegExp('([0-9]+)');
    
                if (regex_doi.test(this.user_input)) {

                    doi = this.user_input.match(regex_doi)[1];
                    console.log("DOI: " + doi.toLowerCase());
                    this.get_pmid(doi);

                } else if (regex_pmcid.test(this.user_input)) {

                    pmcid = this.user_input.match(regex_pmcid)[1];
                    console.log("PMCID: " + pmcid);
                    this.get_pmid(pmcid.toLowerCase());

                } else if (regex_pubmed_url.test(this.user_input)) {

                    url = this.user_input.match(regex_pubmed_url)[1];
                    pmid = url.substring(8); // Extract PMID from regular expression
                    console.log("PMID: " + pmid);
                    this.pmid = pmid;

                } else if (regex_pmid.test(this.user_input)) {

                    console.log("PMID: " + this.user_input);
                    this.pmid = this.user_input;
                
                } else {

                    console.log("Invalid user input.")
                    this.loading = false;
                    this.success = false;
                    this.failed = true;

                }

                // Update previous input
                this.previous_input = this.user_input;
            }
        },
        get_pmid: function(id) {
            const vm = this;
            console.log("Converting to PMID.");
            axios
                .get('https://cors-anywhere.herokuapp.com/https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?tool=citation_ninja&email=citationninja@gmail.com&ids=' + id + '&format=json')
                .then(response => {
                    vm.loading = true;
                    vm.pmid = response.data.records[0].pmid;
                    console.log("PMID: " + vm.pmid);
                })
                .catch(error => {
                    console.log("Conversion failed.");
                    vm.errored = true;
                })
                .finally(() => {
                    vm.loading = true;
                    if (vm.errored) {
                        vm.failed = true;
                        vm.loading = false;
                        vm.success = false;
                        throw new Error("Try no more.");
                    }
                })
        },
        copy_citation: function(id) {
            if (document.selection) { 
                var range = document.body.createTextRange();
                range.moveToElementText(document.getElementById(id));
                range.select().createTextRange();
                document.execCommand("copy"); 
            
            } else if (window.getSelection) {
                var range = document.createRange();
                range.selectNode(document.getElementById(id));
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                document.execCommand("copy");
                window.getSelection().removeAllRanges();
                this.copied = true;
            }
        },
    },
    watch: {
        pmid: function(pmid) {
            const self = this;
            console.log("Asking for article metadata.")
            axios
                .get('https://cors-anywhere.herokuapp.com/https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=' + pmid + '&retmode=json')
                .then(response => {
                    self.loading = true;
                    self.title = response.data.result[pmid].title;
                    self.authors = response.data.result[pmid].authors;
                    self.journal = response.data.result[pmid].source;
                    self.year = response.data.result[pmid].pubdate.substring(0, 4);
                    self.volume = response.data.result[pmid].volume;
                    self.issue = response.data.result[pmid].issue;
                    self.pages = response.data.result[pmid].pages;
                    self.pubstatus = response.data.result[pmid].pubstatus;

                    // Delete last character of title and jounal name if it is a dot, 
                    if (self.title.slice(-1) == ".") {self.title = self.title.slice(0, -1)};
                    if (self.journal.slice(-1) == ".") {self.journal = self.journal.slice(0, -1)};
                    
                    // If there are more than 6 authors, print "et al".
                    if (self.authors.length > 6) {
                        var et_al = {name: "et al"};
                        self.authors.length = 6;
                        self.authors.push(et_al);
                    }
                    
                })
                .catch(error => {
                    console.log("Failed to get metadata.")
                    self.errored = true;
                })
                .finally(() => {
                    self.loading = false;
                    if (self.errored) {
                        self.failed = true;
                    }
                    else {
                        self.success = true;
                        console.log("Done.")
                    }
                })
        }
    }
});